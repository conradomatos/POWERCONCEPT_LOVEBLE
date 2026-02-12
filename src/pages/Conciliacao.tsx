import { useState, useRef, useCallback, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Building2,
  FileSpreadsheet,
  CreditCard,
  Upload,
  X,
  Play,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeftRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ParsedFileInfo {
  file: File;
  rowCount: number;
  period?: string;
  contasCorrentes?: string[];
  valorTotal?: number;
}

type FileType = 'banco' | 'omie' | 'cartao';

const ACCEPT_MAP: Record<FileType, string> = {
  banco: '.xlsx,.xls,.csv',
  omie: '.xlsx,.xls',
  cartao: '.xlsx,.xls,.csv',
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
    // Try DD/MM/YYYY
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
    // Try first key that looks like a date
    for (const [, val] of Object.entries(row)) {
      const d = parseExcelDate(val);
      if (d && d.getFullYear() > 2000) {
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${month}/${d.getFullYear()}`;
      }
    }
    break; // only check first row
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

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function Conciliacao() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [files, setFiles] = useState<Record<FileType, ParsedFileInfo | null>>({
    banco: null,
    omie: null,
    cartao: null,
  });

  const bancoRef = useRef<HTMLInputElement>(null);
  const omieRef = useRef<HTMLInputElement>(null);
  const cartaoRef = useRef<HTMLInputElement>(null);

  const refs: Record<FileType, React.RefObject<HTMLInputElement>> = {
    banco: bancoRef,
    omie: omieRef,
    cartao: cartaoRef,
  };

  const handleFile = useCallback((type: FileType, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        const info: ParsedFileInfo = { file, rowCount: rows.length };

        if (type === 'banco') {
          info.period = detectPeriod(rows);
        } else if (type === 'omie') {
          info.period = detectPeriod(rows);
          info.contasCorrentes = extractContasCorrentes(rows);
        } else if (type === 'cartao') {
          info.valorTotal = sumValores(rows);
          info.period = detectPeriod(rows);
        }

        setFiles((prev) => ({ ...prev, [type]: info }));
        toast.success(`${file.name} carregado — ${rows.length} registros`);
      } catch {
        toast.error(`Erro ao parsear ${file.name}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

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

  const removeFile = useCallback((type: FileType) => {
    setFiles((prev) => ({ ...prev, [type]: null }));
  }, []);

  const mesReferencia = useMemo(() => {
    const period = files.banco?.period || files.omie?.period || files.cartao?.period;
    if (!period || period === '--') return null;
    const [mm, yyyy] = period.split('/');
    return `${MONTHS[Number(mm) - 1]} ${yyyy}`;
  }, [files]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const canExecute = files.banco && files.omie;

  const handleExecute = () => {
    toast.info('Processamento será implementado na Fase 2');
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
        {/* Zona 1 - Header */}
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
          <Badge variant="secondary" className="text-sm self-start">
            Ref: {mesReferencia || '—'}
          </Badge>
        </div>

        {/* Zona 2 - Upload Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cardConfigs.map(({ type, title, icon: Icon, headerClass, iconClass }) => {
            const info = files[type];
            return (
              <Card key={type} className="overflow-hidden">
                <CardHeader className={`${headerClass} py-3 px-4`}>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${iconClass}`} />
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {info ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate max-w-[180px]">{info.file.name}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(type)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>{info.rowCount} lançamentos</p>
                        {info.period && info.period !== '--' && <p>Período: {info.period}</p>}
                        {info.contasCorrentes && info.contasCorrentes.length > 0 && (
                          <p>Contas: {info.contasCorrentes.join(', ')}</p>
                        )}
                        {info.valorTotal != null && <p>Total: {formatCurrency(info.valorTotal)}</p>}
                      </div>
                      <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Carregado
                      </Badge>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-accent/30 transition-colors"
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={handleDrop(type)}
                      onClick={() => refs[type].current?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">Arraste ou clique para carregar</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {ACCEPT_MAP[type].replace(/\./g, '').toUpperCase().replace(/,/g, ', ')}
                      </p>
                    </div>
                  )}
                  <input
                    ref={refs[type]}
                    type="file"
                    accept={ACCEPT_MAP[type]}
                    className="hidden"
                    onChange={handleInputChange(type)}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Zona 3 - Ação + Resultados */}
        <div className="space-y-4">
          <Button
            onClick={handleExecute}
            disabled={!canExecute}
            className="gap-2"
            size="lg"
          >
            <Play className="h-4 w-4" />
            Executar Conciliação
          </Button>

          {/* KPI Cards placeholder */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-1" />
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Conciliados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Divergências</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-5 w-5 mx-auto text-red-500 mb-1" />
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Em Atraso</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CreditCard className="h-5 w-5 mx-auto text-purple-500 mb-1" />
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Cartão Importáveis</p>
              </CardContent>
            </Card>
          </div>

          {/* Download buttons placeholder */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled className="gap-2">
              <Download className="h-4 w-4" /> Relatório (.md)
            </Button>
            <Button variant="outline" disabled className="gap-2">
              <Download className="h-4 w-4" /> Divergências (.xlsx)
            </Button>
            <Button variant="outline" disabled className="gap-2">
              <Download className="h-4 w-4" /> Importação Cartão (.xlsx)
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
