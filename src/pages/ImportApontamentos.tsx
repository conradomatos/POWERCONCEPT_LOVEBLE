import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { validateCPF, cleanCPF } from '@/lib/cpf';
import { Upload, FileText, CheckCircle2, XCircle, AlertCircle, Download } from 'lucide-react';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// Constants
const HORAS_MENSAIS_PADRAO = 220;
const MULT_50 = 1.5;
const MULT_100 = 2.0;
const MULT_NOTURNO = 1.0;

type RowStatus = 'OK' | 'ERRO' | 'AVISO';
type ErrorCode = 
  | 'CPF_INVALIDO' 
  | 'CPF_NAO_ENCONTRADO' 
  | 'DATA_INVALIDA' 
  | 'OS_VAZIA'
  | 'OS_NAO_ENCONTRADA' 
  | 'HORAS_INVALIDAS'
  | 'SEM_CUSTO_VIGENTE';

interface PreviewRow {
  linha_csv: number;
  cpf: string;
  cpf_limpo: string;
  data: string;
  data_parsed: Date | null;
  os: string;
  horas_normais: number;
  horas_50: number;
  horas_100: number;
  horas_noturnas: number;
  falta_horas: number;
  status_linha: RowStatus;
  codigo_erro_ou_aviso: ErrorCode | null;
  mensagem: string;
  colaborador_id?: string;
  projeto_id?: string;
  custo_vigente?: {
    custo_hora: number;
    custo_mensal_total: number;
  } | null;
}

interface ReportRow {
  linha_csv: number;
  cpf: string;
  data: string;
  os: string;
  status_linha: RowStatus;
  codigo_erro_ou_aviso: string;
  mensagem: string;
}

export default function ImportApontamentos() {
  const navigate = useNavigate();
  const { user, loading, hasRole } = useAuth();
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [results, setResults] = useState<{ ok: number; avisos: number; erros: number }>({ ok: 0, avisos: 0, erros: 0 });
  const [activeTab, setActiveTab] = useState<string>('todos');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAccess = hasRole('admin') || hasRole('rh');

  // Fetch collaborators for lookup
  const { data: collaborators } = useQuery({
    queryKey: ['collaborators-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, cpf, full_name');
      if (error) throw error;
      return data;
    },
    enabled: canAccess,
  });

  // Fetch projects for lookup
  const { data: projetos } = useQuery({
    queryKey: ['projetos-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, os, nome');
      if (error) throw error;
      return data;
    },
    enabled: canAccess,
  });

  // Fetch all custos for validation
  const { data: custos } = useQuery({
    queryKey: ['custos-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custos_colaborador')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: canAccess,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Create lookup maps
  const cpfToCollaborator = useMemo(() => {
    const map = new Map<string, { id: string; full_name: string }>();
    collaborators?.forEach((c) => {
      map.set(cleanCPF(c.cpf), { id: c.id, full_name: c.full_name });
    });
    return map;
  }, [collaborators]);

  const osToProject = useMemo(() => {
    const map = new Map<string, { id: string; nome: string }>();
    projetos?.forEach((p) => {
      map.set(p.os.trim(), { id: p.id, nome: p.nome });
    });
    return map;
  }, [projetos]);

  // Parse CSV
  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter((line) => line.trim());
    return lines.map((line) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';') && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  // Parse date (DD/MM/YYYY or YYYY-MM-DD)
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    
    // Try DD/MM/YYYY
    const ddmmyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const match1 = dateStr.match(ddmmyyyy);
    if (match1) {
      const [, day, month, year] = match1;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) return date;
    }
    
    // Try YYYY-MM-DD
    const yyyymmdd = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
    const match2 = dateStr.match(yyyymmdd);
    if (match2) {
      const [, year, month, day] = match2;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) return date;
    }
    
    return null;
  };

  // Parse hours (accept comma or dot)
  const parseHours = (value: string): number | null => {
    if (!value || value.trim() === '') return 0;
    const normalized = value.replace(',', '.').trim();
    const num = parseFloat(normalized);
    if (isNaN(num) || num < 0) return null;
    return num;
  };

  // Format date for display
  const formatDateStr = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR');
  };

  // Format date for DB (YYYY-MM-DD)
  const formatDateDB = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Get custo vigente for a collaborator at a given date
  const getCustoVigente = (colaboradorId: string, dataRef: Date) => {
    if (!custos) return null;
    
    const dateStr = formatDateDB(dataRef);
    const custoVigente = custos.find((c) => {
      if (c.colaborador_id !== colaboradorId) return false;
      if (c.inicio_vigencia > dateStr) return false;
      if (c.fim_vigencia && c.fim_vigencia < dateStr) return false;
      return true;
    });
    
    if (!custoVigente) return null;
    
    // Calculate custo_mensal_total based on classificacao
    let custoMensalTotal: number;
    if (custoVigente.classificacao === 'PJ') {
      custoMensalTotal = Number(custoVigente.salario_base);
    } else {
      const adicionalPericulosidade = custoVigente.periculosidade 
        ? Number(custoVigente.salario_base) * 0.30 
        : 0;
      custoMensalTotal = Number(custoVigente.salario_base) + adicionalPericulosidade + Number(custoVigente.beneficios || 0);
    }
    
    const custoHora = custoMensalTotal / HORAS_MENSAIS_PADRAO;
    
    return {
      custo_hora: Math.round(custoHora * 100) / 100,
      custo_mensal_total: custoMensalTotal,
    };
  };

  // Validate a single row
  const validateRow = (row: Record<string, string>, rowNum: number): PreviewRow => {
    const cpfRaw = row['cpf'] || '';
    const cpfLimpo = cleanCPF(cpfRaw);
    const dataRaw = row['data'] || '';
    const osRaw = (row['os'] || '').trim();
    
    // Parse hours
    const horasNormais = parseHours(row['horas_normais']);
    const horas50 = parseHours(row['horas_50']);
    const horas100 = parseHours(row['horas_100']);
    const horasNoturnas = parseHours(row['horas_noturnas']);
    const faltaHoras = parseHours(row['falta_horas']);
    
    const dataParsed = parseDate(dataRaw);
    
    const result: PreviewRow = {
      linha_csv: rowNum,
      cpf: cpfRaw,
      cpf_limpo: cpfLimpo,
      data: dataRaw,
      data_parsed: dataParsed,
      os: osRaw,
      horas_normais: horasNormais ?? 0,
      horas_50: horas50 ?? 0,
      horas_100: horas100 ?? 0,
      horas_noturnas: horasNoturnas ?? 0,
      falta_horas: faltaHoras ?? 0,
      status_linha: 'OK',
      codigo_erro_ou_aviso: null,
      mensagem: '',
    };
    
    // Validation: CPF format
    if (!cpfLimpo || !validateCPF(cpfLimpo)) {
      result.status_linha = 'ERRO';
      result.codigo_erro_ou_aviso = 'CPF_INVALIDO';
      result.mensagem = 'CPF inválido (formato ou dígitos verificadores incorretos)';
      return result;
    }
    
    // Validation: CPF exists in collaborators
    const colaborador = cpfToCollaborator.get(cpfLimpo);
    if (!colaborador) {
      result.status_linha = 'ERRO';
      result.codigo_erro_ou_aviso = 'CPF_NAO_ENCONTRADO';
      result.mensagem = 'CPF não encontrado na base de colaboradores';
      return result;
    }
    result.colaborador_id = colaborador.id;
    
    // Validation: Date
    if (!dataParsed) {
      result.status_linha = 'ERRO';
      result.codigo_erro_ou_aviso = 'DATA_INVALIDA';
      result.mensagem = 'Data inválida (use DD/MM/AAAA ou YYYY-MM-DD)';
      return result;
    }
    
    // Validation: OS not empty
    if (!osRaw) {
      result.status_linha = 'ERRO';
      result.codigo_erro_ou_aviso = 'OS_VAZIA';
      result.mensagem = 'OS não pode ser vazia';
      return result;
    }
    
    // Validation: OS exists in projects
    const projeto = osToProject.get(osRaw);
    if (!projeto) {
      result.status_linha = 'ERRO';
      result.codigo_erro_ou_aviso = 'OS_NAO_ENCONTRADA';
      result.mensagem = `OS "${osRaw}" não encontrada nos projetos`;
      return result;
    }
    result.projeto_id = projeto.id;
    
    // Validation: Hours are valid
    if (horasNormais === null || horas50 === null || horas100 === null || 
        horasNoturnas === null || faltaHoras === null) {
      result.status_linha = 'ERRO';
      result.codigo_erro_ou_aviso = 'HORAS_INVALIDAS';
      result.mensagem = 'Uma ou mais colunas de horas contém valor inválido ou negativo';
      return result;
    }
    
    // Check for custo vigente (warning, not error)
    const custoVigente = getCustoVigente(colaborador.id, dataParsed);
    result.custo_vigente = custoVigente;
    
    if (!custoVigente) {
      result.status_linha = 'AVISO';
      result.codigo_erro_ou_aviso = 'SEM_CUSTO_VIGENTE';
      result.mensagem = 'Não existe custo vigente do colaborador para esta data';
      return result;
    }
    
    // All OK
    result.status_linha = 'OK';
    result.mensagem = 'Validação OK';
    return result;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!collaborators || !projetos || !custos) {
      toast.error('Aguarde o carregamento dos dados...');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);

      if (rows.length < 2) {
        toast.error('Arquivo deve conter cabeçalho e pelo menos uma linha de dados');
        return;
      }

      const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'));
      
      // Validate required columns
      const requiredColumns = ['cpf', 'data', 'os', 'horas_normais', 'horas_50', 'horas_100', 'horas_noturnas', 'falta_horas'];
      const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        toast.error(`Colunas obrigatórias faltando: ${missingColumns.join(', ')}`);
        return;
      }

      const dataRows = rows.slice(1);

      const previewData = dataRows.map((row, index) => {
        const rowObj: Record<string, string> = {};
        headers.forEach((header, i) => {
          rowObj[header] = row[i] || '';
        });
        return validateRow(rowObj, index + 2);
      });

      setPreview(previewData);
      setImported(false);
      setActiveTab('todos');
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validRows = preview.filter((r) => r.status_linha !== 'ERRO');
    if (validRows.length === 0) {
      toast.error('Nenhum registro válido para importar');
      return;
    }

    setImporting(true);
    let okCount = 0;
    let avisoCount = 0;
    let erroCount = preview.filter((r) => r.status_linha === 'ERRO').length;

    for (const row of validRows) {
      const dateStr = formatDateDB(row.data_parsed!);
      const hasWarningSemCusto = row.status_linha === 'AVISO';
      
      // Upsert apontamentos_horas_dia
      const { error: apontamentoError } = await supabase
        .from('apontamentos_horas_dia')
        .upsert({
          cpf: row.cpf_limpo,
          colaborador_id: row.colaborador_id!,
          data: dateStr,
          os: row.os,
          projeto_id: row.projeto_id!,
          horas_normais: row.horas_normais,
          horas_50: row.horas_50,
          horas_100: row.horas_100,
          horas_noturnas: row.horas_noturnas,
          falta_horas: row.falta_horas,
          warning_sem_custo: hasWarningSemCusto,
          fonte: 'CSV',
        }, {
          onConflict: 'cpf,data,projeto_id',
        });

      if (apontamentoError) {
        console.error('Erro ao inserir apontamento:', apontamentoError);
        erroCount++;
        continue;
      }

      // Calculate and upsert custo_projeto_dia
      let custoData: {
        cpf: string;
        colaborador_id: string;
        data: string;
        projeto_id: string;
        custo_hora: number | null;
        horas_normais: number;
        horas_50: number;
        horas_100: number;
        horas_noturnas: number;
        falta_horas: number;
        custo_normal: number | null;
        custo_50: number | null;
        custo_100: number | null;
        custo_noturno: number | null;
        custo_total: number | null;
        status: 'OK' | 'SEM_CUSTO';
        observacao: string | null;
      };

      if (row.custo_vigente) {
        const custoHora = row.custo_vigente.custo_hora;
        const custoNormal = row.horas_normais * custoHora;
        const custo50 = row.horas_50 * custoHora * MULT_50;
        const custo100 = row.horas_100 * custoHora * MULT_100;
        const custoNoturno = row.horas_noturnas * custoHora * MULT_NOTURNO;
        const custoTotal = custoNormal + custo50 + custo100 + custoNoturno;

        custoData = {
          cpf: row.cpf_limpo,
          colaborador_id: row.colaborador_id!,
          data: dateStr,
          projeto_id: row.projeto_id!,
          custo_hora: custoHora,
          horas_normais: row.horas_normais,
          horas_50: row.horas_50,
          horas_100: row.horas_100,
          horas_noturnas: row.horas_noturnas,
          falta_horas: row.falta_horas,
          custo_normal: Math.round(custoNormal * 100) / 100,
          custo_50: Math.round(custo50 * 100) / 100,
          custo_100: Math.round(custo100 * 100) / 100,
          custo_noturno: Math.round(custoNoturno * 100) / 100,
          custo_total: Math.round(custoTotal * 100) / 100,
          status: 'OK',
          observacao: null,
        };
        okCount++;
      } else {
        custoData = {
          cpf: row.cpf_limpo,
          colaborador_id: row.colaborador_id!,
          data: dateStr,
          projeto_id: row.projeto_id!,
          custo_hora: null,
          horas_normais: row.horas_normais,
          horas_50: row.horas_50,
          horas_100: row.horas_100,
          horas_noturnas: row.horas_noturnas,
          falta_horas: row.falta_horas,
          custo_normal: null,
          custo_50: null,
          custo_100: null,
          custo_noturno: null,
          custo_total: null,
          status: 'SEM_CUSTO',
          observacao: 'Sem custo vigente na data',
        };
        avisoCount++;
      }

      const { error: custoError } = await supabase
        .from('custo_projeto_dia')
        .upsert(custoData, {
          onConflict: 'cpf,data,projeto_id',
        });

      if (custoError) {
        console.error('Erro ao inserir custo:', custoError);
      }
    }

    setResults({ ok: okCount, avisos: avisoCount, erros: erroCount });
    setImported(true);
    setImporting(false);

    if (okCount > 0 || avisoCount > 0) {
      toast.success(`Importação concluída: ${okCount} OK, ${avisoCount} com aviso`);
    }
    if (erroCount > 0) {
      toast.error(`${erroCount} registro(s) rejeitados`);
    }
  };

  const handleReset = () => {
    setPreview([]);
    setImported(false);
    setResults({ ok: 0, avisos: 0, erros: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateReport = (): ReportRow[] => {
    return preview.map((row) => ({
      linha_csv: row.linha_csv,
      cpf: row.cpf,
      data: row.data,
      os: row.os,
      status_linha: row.status_linha,
      codigo_erro_ou_aviso: row.codigo_erro_ou_aviso || '',
      mensagem: row.mensagem,
    }));
  };

  const downloadCSV = () => {
    const report = generateReport();
    const headers = ['linha_csv', 'cpf', 'data', 'os', 'status_linha', 'codigo_erro_ou_aviso', 'mensagem'];
    const csvContent = [
      headers.join(';'),
      ...report.map((row) => 
        headers.map((h) => `"${String(row[h as keyof ReportRow]).replace(/"/g, '""')}"`).join(';')
      ),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_importacao_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter preview based on active tab
  const filteredPreview = useMemo(() => {
    switch (activeTab) {
      case 'ok':
        return preview.filter((r) => r.status_linha === 'OK');
      case 'avisos':
        return preview.filter((r) => r.status_linha === 'AVISO');
      case 'erros':
        return preview.filter((r) => r.status_linha === 'ERRO');
      default:
        return preview;
    }
  }, [preview, activeTab]);

  // Counts
  const counts = useMemo(() => ({
    total: preview.length,
    ok: preview.filter((r) => r.status_linha === 'OK').length,
    avisos: preview.filter((r) => r.status_linha === 'AVISO').length,
    erros: preview.filter((r) => r.status_linha === 'ERRO').length,
  }), [preview]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Você não tem permissão para importar apontamentos.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Importar Apontamentos (CSV)</h2>
          <p className="text-muted-foreground">Importe apontamentos de horas a partir de um arquivo CSV</p>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Formato do Arquivo</CardTitle>
            <CardDescription>
              O arquivo CSV deve conter exatamente estas colunas (primeira linha = cabeçalho):
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Colunas obrigatórias:</strong> cpf, data, os, horas_normais, horas_50, horas_100, horas_noturnas, falta_horas</p>
              <p><strong>Formatos aceitos:</strong></p>
              <ul className="list-disc list-inside ml-4">
                <li>CPF: com ou sem máscara (123.456.789-00 ou 12345678900)</li>
                <li>Data: DD/MM/AAAA ou YYYY-MM-DD</li>
                <li>Horas: aceita vírgula ou ponto como decimal</li>
                <li>OS: número único do projeto</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Upload */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8">
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Selecione um arquivo CSV
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="csv-apontamentos-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="csv-apontamentos-upload" className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Selecionar Arquivo
                </label>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {preview.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Preview e Validação</CardTitle>
                <CardDescription>
                  Total: {counts.total} | OK: {counts.ok} | Avisos: {counts.avisos} | Erros: {counts.erros}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Relatório
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Limpar
                </Button>
                {!imported && (
                  <Button
                    onClick={handleImport}
                    disabled={importing || (counts.ok + counts.avisos) === 0}
                  >
                    {importing ? 'Importando...' : `Importar ${counts.ok + counts.avisos} registros`}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {imported && (
                <div className="mb-4 p-4 rounded-lg bg-muted flex items-center gap-4">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Importação concluída</p>
                    <p className="text-sm text-muted-foreground">
                      OK: {results.ok} | Avisos: {results.avisos} | Erros: {results.erros}
                    </p>
                  </div>
                </div>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
                <TabsList>
                  <TabsTrigger value="todos">
                    Todos ({counts.total})
                  </TabsTrigger>
                  <TabsTrigger value="ok">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    OK ({counts.ok})
                  </TabsTrigger>
                  <TabsTrigger value="avisos">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Avisos ({counts.avisos})
                  </TabsTrigger>
                  <TabsTrigger value="erros">
                    <XCircle className="h-3 w-3 mr-1" />
                    Erros ({counts.erros})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Linha</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead className="text-right">Normais</TableHead>
                      <TableHead className="text-right">50%</TableHead>
                      <TableHead className="text-right">100%</TableHead>
                      <TableHead className="text-right">Noturnas</TableHead>
                      <TableHead className="text-right">Falta</TableHead>
                      <TableHead>Mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPreview.slice(0, 100).map((row) => (
                      <TableRow 
                        key={row.linha_csv} 
                        className={
                          row.status_linha === 'ERRO' 
                            ? 'bg-destructive/5' 
                            : row.status_linha === 'AVISO' 
                              ? 'bg-yellow-500/5' 
                              : ''
                        }
                      >
                        <TableCell>{row.linha_csv}</TableCell>
                        <TableCell>
                          {row.status_linha === 'OK' && (
                            <Badge variant="default" className="bg-green-600">OK</Badge>
                          )}
                          {row.status_linha === 'AVISO' && (
                            <Badge variant="secondary" className="bg-yellow-500 text-yellow-900">AVISO</Badge>
                          )}
                          {row.status_linha === 'ERRO' && (
                            <Badge variant="destructive">ERRO</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.cpf}</TableCell>
                        <TableCell>{row.data_parsed ? formatDateStr(row.data_parsed) : row.data}</TableCell>
                        <TableCell>{row.os}</TableCell>
                        <TableCell className="text-right">{row.horas_normais.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{row.horas_50.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{row.horas_100.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{row.horas_noturnas.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{row.falta_horas.toFixed(2)}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={row.mensagem}>
                          {row.codigo_erro_ou_aviso && (
                            <span className="font-medium">{row.codigo_erro_ou_aviso}: </span>
                          )}
                          {row.mensagem}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredPreview.length > 100 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Mostrando 100 de {filteredPreview.length} registros
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
