import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Building2,
  FileSpreadsheet,
  CreditCard,
  Play,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeftRight,
  Loader2,
  FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { executarConciliacao, executarConciliacaoFromData } from '@/lib/conciliacao/engine';
import type { ResultadoConciliacao, LancamentoBanco, LancamentoOmie, TransacaoCartao, CartaoInfo } from '@/lib/conciliacao/types';
import { gerarRelatorioMD, gerarExcelDivergencias, gerarExcelImportacaoCartao, gerarRelatorioPDF } from '@/lib/conciliacao/outputs';
import { useConciliacaoStorage, rehydrateBanco, rehydrateOmie, rehydrateCartao, rehydrateResultado } from '@/hooks/useConciliacaoStorage';
import ImportPreviewCard from '@/components/conciliacao/ImportPreviewCard';
import ResultTabs from '@/components/conciliacao/ResultTabs';

interface ParsedFileInfo {
  file: File | null;
  rowCount: number;
  period?: string;
  contasCorrentes?: string[];
  valorTotal?: number;
  fileName: string;
  parsedBanco?: LancamentoBanco[];
  parsedOmie?: LancamentoOmie[];
  parsedCartao?: TransacaoCartao[];
  parsedCartaoInfo?: CartaoInfo;
  saldoAnterior?: number | null;
}

type FileType = 'banco' | 'omie' | 'cartao';

const ACCEPT_MAP: Record<FileType, string> = {
  banco: '.xlsx,.xls,.csv',
  omie: '.xlsx,.xls',
  cartao: '.xlsx,.xls,.csv',
};

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const TIPO_MAP: Record<FileType, 'extrato_banco' | 'extrato_omie' | 'fatura_cartao'> = {
  banco: 'extrato_banco',
  omie: 'extrato_omie',
  cartao: 'fatura_cartao',
};

function parseExcelDate(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
    const parts = value.split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function detectPeriod(rows: Record<string, unknown>[]): string {
  const dateKeys = ['data', 'Data', 'DATA', 'date', 'Date', 'dt_lancamento', 'data_lancamento', 'Data Lançamento'];
  for (const row of rows) {
    for (const key of dateKeys) {
      if (row[key] != null) {
        const d = parseExcelDate(row[key]);
        if (d) {
          const month = String(d.getMonth() + 1).padStart(2, '0');
          return `${month}/${d.getFullYear()}`;
        }
      }
    }
    for (const [, val] of Object.entries(row)) {
      const d = parseExcelDate(val);
      if (d && d.getFullYear() > 2000) {
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${month}/${d.getFullYear()}`;
      }
    }
    break;
  }
  return '--';
}

function extractContasCorrentes(rows: Record<string, unknown>[]): string[] {
  const keys = ['conta_corrente', 'Conta Corrente', 'conta', 'Conta', 'cc'];
  const set = new Set<string>();
  for (const row of rows) {
    for (const key of keys) {
      if (row[key] != null && String(row[key]).trim()) {
        set.add(String(row[key]).trim());
      }
    }
  }
  return Array.from(set);
}

function sumValores(rows: Record<string, unknown>[]): number {
  const keys = ['valor', 'Valor', 'VALOR', 'value', 'Value', 'vlr', 'total', 'Total'];
  let sum = 0;
  for (const row of rows) {
    for (const key of keys) {
      if (row[key] != null) {
        const v = Number(row[key]);
        if (!isNaN(v)) {
          sum += Math.abs(v);
          break;
        }
      }
    }
  }
  return sum;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function buildPeriodOptions(): { label: string; value: string }[] {
  const now = new Date();
  const options: { label: string; value: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ label, value });
  }
  return options;
}

function periodoRefToLabel(ref: string): string {
  const [year, month] = ref.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

export default function Conciliacao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { saveImport, loadImports, deleteImport, saveResultado, loadResultado, invalidateResultado } = useConciliacaoStorage();

  const now = new Date();
  const initialPeriodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [periodoRef, setPeriodoRef] = useState(initialPeriodo);
  const [files, setFiles] = useState<Record<FileType, ParsedFileInfo | null>>({
    banco: null, omie: null, cartao: null,
  });
  const [savedSources, setSavedSources] = useState<Record<FileType, boolean>>({
    banco: false, omie: false, cartao: false,
  });

  const [resultado, setResultado] = useState<ResultadoConciliacao | null>(null);
  const [processando, setProcessando] = useState(false);
  const [loadingImports, setLoadingImports] = useState(false);
  const [activeTab, setActiveTab] = useState('conciliados');

  const bancoRef = useRef<HTMLInputElement>(null);
  const omieRef = useRef<HTMLInputElement>(null);
  const cartaoRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const refs: Record<FileType, React.RefObject<HTMLInputElement>> = {
    banco: bancoRef, omie: omieRef, cartao: cartaoRef,
  };

  const periodOptions = useMemo(() => buildPeriodOptions(), []);

  // Load saved imports when period changes
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoadingImports(true);
      setFiles({ banco: null, omie: null, cartao: null });
      setSavedSources({ banco: false, omie: false, cartao: false });
      setResultado(null);

      try {
        const imports = await loadImports(periodoRef);
        if (cancelled) return;

        const newFiles: Record<FileType, ParsedFileInfo | null> = { banco: null, omie: null, cartao: null };
        const newSaved: Record<FileType, boolean> = { banco: false, omie: false, cartao: false };

        if (imports.extratoBanco) {
          const d = imports.extratoBanco;
          newFiles.banco = {
            file: null, fileName: d.nome_arquivo || 'Extrato banco',
            rowCount: d.total_lancamentos,
            parsedBanco: rehydrateBanco(d.dados as any[]),
            saldoAnterior: d.saldo_anterior,
          };
          newSaved.banco = true;
        }

        if (imports.extratoOmie) {
          const d = imports.extratoOmie;
          newFiles.omie = {
            file: null, fileName: d.nome_arquivo || 'Extrato Omie',
            rowCount: d.total_lancamentos,
            parsedOmie: rehydrateOmie(d.dados as any[]),
            saldoAnterior: d.saldo_anterior,
          };
          newSaved.omie = true;
        }

        if (imports.faturaCartao) {
          const d = imports.faturaCartao;
          newFiles.cartao = {
            file: null, fileName: d.nome_arquivo || 'Fatura cartão',
            rowCount: d.total_lancamentos, valorTotal: d.valor_total,
            parsedCartao: rehydrateCartao(d.dados as any[]),
            parsedCartaoInfo: d.metadata?.cartaoInfo || { vencimento: '', valorTotal: 0, situacao: '', despesasBrasil: 0, despesasExterior: 0, pagamentos: 0 },
          };
          newSaved.cartao = true;
        }

        setFiles(newFiles);
        setSavedSources(newSaved);

        // Load saved resultado
        try {
          const savedResultado = await loadResultado(periodoRef);
          if (!cancelled && savedResultado) {
            const rehydrated = rehydrateResultado(savedResultado);
            setResultado(rehydrated);
          }
        } catch (err) {
          console.error('Erro ao carregar resultado:', err);
        }
      } catch (err) {
        console.error('Erro ao carregar imports:', err);
      } finally {
        if (!cancelled) setLoadingImports(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [periodoRef, user]);

  const handleFile = useCallback((type: FileType, file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        const info: ParsedFileInfo = { file, fileName: file.name, rowCount: rows.length };

        if (type === 'banco') {
          info.period = detectPeriod(rows);
        } else if (type === 'omie') {
          info.period = detectPeriod(rows);
          info.contasCorrentes = extractContasCorrentes(rows);
        } else if (type === 'cartao') {
          info.valorTotal = sumValores(rows);
          info.period = detectPeriod(rows);
        }

        const { parseBanco, parseOmie, parseCartaoFromText, workbookToRows, csvToText } = await import('@/lib/conciliacao/parsers');

        if (type === 'banco') {
          const bancoRows = await workbookToRows(file);
          const { lancamentos, saldoAnterior } = parseBanco(bancoRows);
          info.parsedBanco = lancamentos;
          info.saldoAnterior = saldoAnterior;
          info.rowCount = lancamentos.length;
        } else if (type === 'omie') {
          const omieRows = await workbookToRows(file);
          const { lancamentos, saldoAnterior } = parseOmie(omieRows);
          info.parsedOmie = lancamentos;
          info.saldoAnterior = saldoAnterior;
          info.rowCount = lancamentos.length;
        } else if (type === 'cartao') {
          const fileName = file.name.toLowerCase();
          let text: string;
          if (fileName.endsWith('.csv')) {
            text = await csvToText(file);
          } else {
            const cartaoRows = await workbookToRows(file);
            text = cartaoRows.map(r => (r || []).join(';')).join('\n');
          }
          const result = parseCartaoFromText(text);
          info.parsedCartao = result.transacoes;
          info.parsedCartaoInfo = result.info;
          info.rowCount = result.transacoes.length;
          info.valorTotal = result.info.valorTotal;
        }

        setFiles((prev) => ({ ...prev, [type]: info }));
        setSavedSources((prev) => ({ ...prev, [type]: false }));

        // Invalidate saved resultado since source data changed
        try {
          await invalidateResultado(periodoRef);
          setResultado(null);
        } catch (err) {
          console.error('Erro ao invalidar resultado:', err);
        }

        try {
          const valorTotal = type === 'cartao'
            ? (info.parsedCartaoInfo?.valorTotal || 0)
            : (type === 'banco'
              ? (info.parsedBanco || []).reduce((s, b) => s + Math.abs(b.valor), 0)
              : (info.parsedOmie || []).reduce((s, o) => s + Math.abs(o.valor), 0));

          const dados = type === 'banco' ? info.parsedBanco
            : type === 'omie' ? info.parsedOmie
            : info.parsedCartao;

          await saveImport({
            tipo: TIPO_MAP[type],
            periodoRef,
            nomeArquivo: file.name,
            totalLancamentos: info.rowCount,
            valorTotal,
            saldoAnterior: info.saldoAnterior ?? undefined,
            dados: dados || [],
            metadata: type === 'cartao' ? { cartaoInfo: info.parsedCartaoInfo } : undefined,
          });

          setSavedSources((prev) => ({ ...prev, [type]: true }));
          const label = periodoRefToLabel(periodoRef);
          toast.success(`${file.name} salvo para ${label}`);
        } catch (saveErr) {
          console.error('Erro ao salvar no banco:', saveErr);
          toast.success(`${file.name} carregado — ${info.rowCount} registros`);
          toast.error('Erro ao salvar no banco de dados');
        }
      } catch {
        toast.error(`Erro ao parsear ${file.name}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [periodoRef, saveImport]);

  const handleDrop = useCallback(
    (type: FileType) => (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(type, file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (type: FileType) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(type, file);
      e.target.value = '';
    },
    [handleFile]
  );

  const removeFile = useCallback(async (type: FileType) => {
    try {
      await deleteImport(TIPO_MAP[type], periodoRef);
      await invalidateResultado(periodoRef);
      toast.success('Arquivo removido');
    } catch (err) {
      console.error('Erro ao remover:', err);
    }
    setFiles((prev) => ({ ...prev, [type]: null }));
    setSavedSources((prev) => ({ ...prev, [type]: false }));
    setResultado(null);
  }, [periodoRef, deleteImport, invalidateResultado]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const canExecute = files.banco && files.omie && !processando;

  const handleDownloadRelatorio = () => {
    if (!resultado) return;
    try { gerarRelatorioMD(resultado); toast.success('Download do relatório .md iniciado'); }
    catch (error) { console.error('Erro ao gerar relatório:', error); toast.error('Falha ao gerar relatório'); }
  };

  const handleDownloadDivergencias = () => {
    if (!resultado) return;
    try { gerarExcelDivergencias(resultado); toast.success('Download do Excel de divergências iniciado'); }
    catch (error) { console.error('Erro ao gerar divergências:', error); toast.error('Falha ao gerar Excel de divergências'); }
  };

  const handleDownloadImportacao = () => {
    if (!resultado) return;
    try { gerarExcelImportacaoCartao(resultado); toast.success('Download do Excel de importação iniciado'); }
    catch (error) { console.error('Erro ao gerar importação:', error); toast.error('Falha ao gerar Excel de importação'); }
  };

  const handleDownloadPDF = () => {
    if (!resultado) return;
    try { gerarRelatorioPDF(resultado); toast.success('Download do relatório PDF iniciado'); }
    catch (error) { console.error('Erro ao gerar PDF:', error); toast.error('Falha ao gerar PDF'); }
  };

  const handleExecute = async () => {
    const bancoInfo = files.banco;
    const omieInfo = files.omie;
    if (!bancoInfo || !omieInfo) return;

    setProcessando(true);
    setResultado(null);
    try {
      let result: ResultadoConciliacao;
      const hasParsedData = bancoInfo.parsedBanco && omieInfo.parsedOmie;

      if (hasParsedData) {
        const cartaoTransacoes = files.cartao?.parsedCartao || [];
        const cartaoInfo = files.cartao?.parsedCartaoInfo || { vencimento: '', valorTotal: 0, situacao: '', despesasBrasil: 0, despesasExterior: 0, pagamentos: 0 };
        result = executarConciliacaoFromData(
          bancoInfo.parsedBanco!, omieInfo.parsedOmie!,
          cartaoTransacoes, cartaoInfo,
          bancoInfo.saldoAnterior ?? null, omieInfo.saldoAnterior ?? null,
        );
      } else if (bancoInfo.file && omieInfo.file) {
        result = await executarConciliacao(bancoInfo.file, omieInfo.file, files.cartao?.file || null);
      } else {
        toast.error('Dados insuficientes para executar a conciliação');
        return;
      }

      setResultado(result);
      setActiveTab('conciliados');
      toast.success(`Conciliação concluída: ${result.totalConciliados} matches, ${result.totalDivergencias} divergências`);

      // Save resultado to Supabase
      try {
        await saveResultado(periodoRef, result);
        const label = periodoRefToLabel(periodoRef);
        toast.success(`Conciliação salva para ${label}`);
      } catch (saveErr) {
        console.error('Erro ao salvar resultado:', saveErr);
        toast.error('Erro ao salvar resultado no banco de dados');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro na conciliação: ' + (err.message || 'erro desconhecido'));
    } finally {
      setProcessando(false);
    }
  };

  const handleKPIClick = (tab: string) => {
    if (!resultado) return;
    setActiveTab(tab);
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cardConfigs: {
    type: FileType;
    title: string;
    icon: typeof Building2;
    headerClass: string;
    iconClass: string;
  }[] = [
    { type: 'banco', title: 'Extrato Bancário (Sicredi)', icon: Building2, headerClass: 'bg-blue-50 dark:bg-blue-950/30', iconClass: 'text-blue-600' },
    { type: 'omie', title: 'Extrato Omie', icon: FileSpreadsheet, headerClass: 'bg-green-50 dark:bg-green-950/30', iconClass: 'text-green-600' },
    { type: 'cartao', title: 'Fatura Cartão de Crédito', icon: CreditCard, headerClass: 'bg-purple-50 dark:bg-purple-950/30', iconClass: 'text-purple-600' },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ArrowLeftRight className="h-6 w-6 text-primary" />
              Conciliação Financeira
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Cruze extrato bancário, Omie e fatura do cartão para identificar divergências
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <span className="text-sm text-muted-foreground">Ref:</span>
            <Select value={periodoRef} onValueChange={setPeriodoRef}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading indicator */}
        {loadingImports && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando dados salvos...
          </div>
        )}

        {/* Upload Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cardConfigs.map(({ type, title, icon, headerClass, iconClass }) => (
            <ImportPreviewCard
              key={type}
              type={type}
              title={title}
              icon={icon}
              headerClass={headerClass}
              iconClass={iconClass}
              info={files[type]}
              isSaved={savedSources[type]}
              accept={ACCEPT_MAP[type]}
              onRemove={() => removeFile(type)}
              onDrop={handleDrop(type)}
              onInputChange={handleInputChange(type)}
              inputRef={refs[type]}
            />
          ))}
        </div>

        {/* Action + Results */}
        <div className="space-y-4">
          <Button onClick={handleExecute} disabled={!canExecute} className="gap-2" size="lg">
            {processando ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
            ) : (
              <><Play className="h-4 w-4" /> Executar Conciliação</>
            )}
          </Button>

          {/* KPI Cards — clickable */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={`cursor-pointer transition-shadow hover:shadow-md ${activeTab === 'conciliados' && resultado ? 'ring-2 ring-primary/30' : ''}`} onClick={() => handleKPIClick('conciliados')}>
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-1" />
                <p className="text-2xl font-bold">{resultado?.totalConciliados ?? 0}</p>
                <p className="text-xs text-muted-foreground">Conciliados</p>
              </CardContent>
            </Card>
            <Card className={`cursor-pointer transition-shadow hover:shadow-md ${activeTab === 'divergencias' && resultado ? 'ring-2 ring-primary/30' : ''}`} onClick={() => handleKPIClick('divergencias')}>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                <p className="text-2xl font-bold">{resultado?.totalDivergencias ?? 0}</p>
                <p className="text-xs text-muted-foreground">Divergências</p>
              </CardContent>
            </Card>
            <Card className={`cursor-pointer transition-shadow hover:shadow-md ${activeTab === 'sem-match' && resultado ? 'ring-2 ring-primary/30' : ''}`} onClick={() => handleKPIClick('sem-match')}>
              <CardContent className="p-4 text-center">
                <Clock className="h-5 w-5 mx-auto text-red-500 mb-1" />
                <p className="text-2xl font-bold">{resultado?.contasAtraso ?? 0}</p>
                <p className="text-xs text-muted-foreground">Em Atraso</p>
              </CardContent>
            </Card>
            <Card className={`cursor-pointer transition-shadow hover:shadow-md ${activeTab === 'cartao' && resultado ? 'ring-2 ring-primary/30' : ''}`} onClick={() => handleKPIClick('cartao')}>
              <CardContent className="p-4 text-center">
                <CreditCard className="h-5 w-5 mx-auto text-purple-500 mb-1" />
                <p className="text-2xl font-bold">{resultado?.cartaoImportaveis ?? 0}</p>
                <p className="text-xs text-muted-foreground">Cartão Importáveis</p>
              </CardContent>
            </Card>
          </div>

          {/* Matching Summary */}
          {resultado && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Resultado do Matching</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['A', 'B', 'C', 'D'].map(cam => (
                    <div key={cam} className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Camada {cam}</p>
                      <p className="text-lg font-bold">{resultado.camadaCounts[cam] || 0}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Result Tabs */}
          {resultado && (
            <div ref={tabsRef}>
              <ResultTabs resultado={resultado} activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          )}

          {/* Download buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!resultado} onClick={handleDownloadRelatorio} className="gap-2">
              <Download className="h-4 w-4" /> Relatório (.md)
            </Button>
            <Button variant="outline" disabled={!resultado} onClick={handleDownloadPDF} className="gap-2">
              <FileText className="h-4 w-4" /> Relatório (.pdf)
            </Button>
            <Button variant="outline" disabled={!resultado} onClick={handleDownloadDivergencias} className="gap-2">
              <Download className="h-4 w-4" /> Divergências (.xlsx)
            </Button>
            <Button variant="outline" disabled={!resultado} onClick={handleDownloadImportacao} className="gap-2">
              <Download className="h-4 w-4" /> Importação Cartão (.xlsx)
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
