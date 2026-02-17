import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { validateCPF, cleanCPF } from '@/lib/cpf';
import { Upload, CheckCircle2, XCircle, AlertCircle, Download, FileSpreadsheet } from 'lucide-react';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

// Constants
const HORAS_MENSAIS_PADRAO = 220;
const MULT_50 = 1.5;
const MULT_100 = 2.0;
const MULT_NOTURNO = 1.0;

type RowStatus = 'OK' | 'ERRO' | 'AVISO' | 'IGNORADO';
type ErrorCode = 
  | 'CPF_INVALIDO' 
  | 'CPF_NAO_ENCONTRADO' 
  | 'DATA_INVALIDA' 
  | 'OS_VAZIA'
  | 'OS_PENDENTE'
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
  linha: number;
  cpf: string;
  data: string;
  os: string;
  status: RowStatus;
  codigo: string;
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
      map.set(String(p.os).trim(), { id: p.id, nome: p.nome });
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

  // Parse date (DD/MM/YYYY, YYYY-MM-DD, or Excel serial date)
  const parseDate = (value: unknown): Date | null => {
    if (!value) return null;
    
    // If it's already a Date object (from Excel)
    if (value instanceof Date) {
      if (!isNaN(value.getTime())) return value;
      return null;
    }
    
    // If it's a number (Excel serial date)
    if (typeof value === 'number') {
      // Excel dates: days since 1900-01-01 (with leap year bug)
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
      if (!isNaN(date.getTime())) return date;
      return null;
    }
    
    const dateStr = String(value).trim();
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

  // Parse hours (accept Excel time, HH:MM, decimal)
  const parseHours = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return 0;
    
    // If it's a number (Excel time as fraction of day, or decimal hours)
    if (typeof value === 'number') {
      if (value < 0) return null;
      // Excel stores time as fraction of day (e.g., 0.5 = 12 hours)
      // If value is < 1, assume it's Excel time format
      if (value < 1) {
        const hours = value * 24;
        return Math.round(hours * 100) / 100;
      }
      // Otherwise it's already decimal hours
      return Math.round(value * 100) / 100;
    }
    
    const strValue = String(value).trim();
    if (!strValue) return 0;
    
    // Check for HH:MM format
    const hhmmMatch = strValue.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmmMatch) {
      const hours = parseInt(hhmmMatch[1], 10);
      const minutes = parseInt(hhmmMatch[2], 10);
      if (minutes >= 60) return null;
      const decimal = hours + minutes / 60;
      return Math.round(decimal * 100) / 100;
    }
    
    // Try decimal format (comma or dot)
    const normalized = strValue.replace(',', '.');
    const num = parseFloat(normalized);
    if (isNaN(num) || num < 0) return null;
    return Math.round(num * 100) / 100;
  };

  // Download XLSX template
  const downloadXLSXTemplate = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ['cpf', 'data', 'os', 'horas_normais', 'horas_50', 'horas_100', 'horas_noturnas', 'falta_horas (opcional)'],
      ['123.456.789-09', '2026-01-02', '250001', '08:00', '00:00', '00:00', '00:00', '00:00'],
      ['123.456.789-09', '2026-01-03', '250001', '07:30', '00:30', '00:00', '00:00', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 16 }, // cpf
      { wch: 12 }, // data
      { wch: 10 }, // os
      { wch: 14 }, // horas_normais
      { wch: 10 }, // horas_50
      { wch: 10 }, // horas_100
      { wch: 14 }, // horas_noturnas
      { wch: 20 }, // falta_horas (opcional)
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'apontamentos');
    XLSX.writeFile(wb, 'modelo_apontamentos.xlsx');
  };

  // Download CSV template (keep for backward compatibility)
  const downloadCSVTemplate = () => {
    const headers = 'cpf,data,os,horas_normais,horas_50,horas_100,horas_noturnas,falta_horas (opcional)';
    const row1 = '123.456.789-09,2026-01-02,250001,08:00,00:00,00:00,00:00,00:00';
    const row2 = '123.456.789-09,2026-01-03,250001,07:30,00:30,00:00,00:00,';
    const content = `${headers}\n${row1}\n${row2}`;
    
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_apontamentos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
  const validateRow = (row: Record<string, unknown>, rowNum: number): PreviewRow | null => {
    const cpfRaw = String(row['cpf'] || '');
    const cpfLimpo = cleanCPF(cpfRaw);
    const dataRaw = row['data'];
    const osRaw = String(row['os'] || '').trim();
    
    // Parse hours
    const horasNormais = parseHours(row['horas_normais']);
    const horas50 = parseHours(row['horas_50']);
    const horas100 = parseHours(row['horas_100']);
    const horasNoturnas = parseHours(row['horas_noturnas']);
    const faltaHoras = parseHours(row['falta_horas']);
    
    const dataParsed = parseDate(dataRaw);
    
    // Check if row has any hours
    const totalHoras = (horasNormais ?? 0) + (horas50 ?? 0) + (horas100 ?? 0) + (horasNoturnas ?? 0);
    const temHoras = totalHoras > 0;
    const temOS = osRaw !== '';
    
    // If no hours AND no OS, ignore the row completely (return null)
    if (!temHoras && !temOS) {
      return null;
    }
    
    const result: PreviewRow = {
      linha_csv: rowNum,
      cpf: cpfRaw,
      cpf_limpo: cpfLimpo,
      data: dataParsed ? formatDateStr(dataParsed) : String(dataRaw || ''),
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
    
    // Validation: OS - if has hours but no OS, mark as PENDENTE (warning, not error)
    if (!temOS && temHoras) {
      result.status_linha = 'AVISO';
      result.codigo_erro_ou_aviso = 'OS_PENDENTE';
      result.mensagem = 'OS não informada - apontamento pendente de alocação';
      // Continue validation but won't have projeto_id
    } else if (temOS) {
      // Validation: OS exists in projects
      const projeto = osToProject.get(osRaw);
      if (!projeto) {
        result.status_linha = 'ERRO';
        result.codigo_erro_ou_aviso = 'OS_NAO_ENCONTRADA';
        result.mensagem = `OS "${osRaw}" não encontrada nos projetos`;
        return result;
      }
      result.projeto_id = projeto.id;
    }
    
    // Validation: Hours are valid (falta_horas is optional, defaults to 0)
    if (horasNormais === null || horas50 === null || horas100 === null || horasNoturnas === null) {
      result.status_linha = 'ERRO';
      result.codigo_erro_ou_aviso = 'HORAS_INVALIDAS';
      result.mensagem = 'Uma ou mais colunas de horas contém valor inválido ou negativo';
      return result;
    }
    
    // If already has a warning (OS_PENDENTE), keep it
    if (result.status_linha === 'AVISO') {
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

  // Process XLSX file
  const processXLSX = (data: ArrayBuffer) => {
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    
    // Check for 'apontamentos' sheet
    const sheetName = 'apontamentos';
    if (!workbook.SheetNames.includes(sheetName)) {
      toast.error("Aba 'apontamentos' não encontrada. O arquivo XLSX deve conter uma aba chamada 'apontamentos'.");
      return;
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });
    
    if (jsonData.length === 0) {
      toast.error('A aba apontamentos está vazia ou sem dados');
      return;
    }
    
    // Get raw data with original types for hours parsing
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { raw: true });
    
    // Validate required columns (falta_horas is optional)
    const firstRow = jsonData[0];
    const headers = Object.keys(firstRow).map((h) => h.toLowerCase().replace(/\s+/g, '_').replace(/\s*\(opcional\)/g, ''));
    const requiredColumns = ['cpf', 'data', 'os', 'horas_normais', 'horas_50', 'horas_100', 'horas_noturnas'];
    const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      toast.error(`Colunas obrigatórias faltando: ${missingColumns.join(', ')}`);
      return;
    }
    
    // Process rows using raw data for proper type handling
    const previewData = rawData.map((row, index) => {
      // Normalize keys to lowercase and remove (opcional) suffix
      const normalizedRow: Record<string, unknown> = {};
      Object.keys(row).forEach((key) => {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '_').replace(/\s*\(opcional\)/g, '');
        normalizedRow[normalizedKey] = row[key];
      });
      return validateRow(normalizedRow, index + 2);
    }).filter((row): row is PreviewRow => row !== null); // Filter out ignored rows (null)
    
    setPreview(previewData);
    setImported(false);
    setActiveTab('todos');
  };

  // Process CSV file
  const processCSV = (text: string) => {
    const rows = parseCSV(text);

    if (rows.length < 2) {
      toast.error('Arquivo deve conter cabeçalho e pelo menos uma linha de dados');
      return;
    }

    const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, '_').replace(/\s*\(opcional\)/g, ''));
    
    // Validate required columns (falta_horas is optional)
    const requiredColumns = ['cpf', 'data', 'os', 'horas_normais', 'horas_50', 'horas_100', 'horas_noturnas'];
    const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      toast.error(`Colunas obrigatórias faltando: ${missingColumns.join(', ')}`);
      return;
    }

    const dataRows = rows.slice(1);

    const previewData = dataRows.map((row, index) => {
      const rowObj: Record<string, unknown> = {};
      headers.forEach((header, i) => {
        rowObj[header] = row[i] || '';
      });
      return validateRow(rowObj, index + 2);
    }).filter((row): row is PreviewRow => row !== null); // Filter out ignored rows (null)

    setPreview(previewData);
    setImported(false);
    setActiveTab('todos');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!collaborators || !projetos || !custos) {
      toast.error('Aguarde o carregamento dos dados...');
      return;
    }

    const isXLSX = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

    if (isXLSX) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as ArrayBuffer;
        processXLSX(data);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processCSV(text);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    // Get file name for archive tracking
    const fileName = fileInputRef.current?.files?.[0]?.name || 'import';
    
    // Create arquivo_importacao record
    const { data: arquivoData, error: arquivoError } = await supabase
      .from('arquivos_importacao')
      .insert({
        nome_arquivo: fileName,
        tipo_arquivo: fileName.endsWith('.xlsx') ? 'XLSX' : 'CSV',
        total_linhas: preview.length,
        linhas_sucesso: 0,
        linhas_erro: 0,
        usuario_id: user?.id,
      })
      .select('id')
      .single();
    
    if (arquivoError) {
      toast.error('Erro ao registrar arquivo de importação');
      return;
    }
    
    const arquivoId = arquivoData.id;

    setImporting(true);
    let okCount = 0;
    let avisoCount = 0;
    let erroCount = 0;

    // Group rows by collaborator and project to create/update allocation blocks
    const blocksMap = new Map<string, { colaborador_id: string; projeto_id: string; dates: string[] }>();

    // Get project and collaborator info for consolidated table
    const projectMap = new Map<string, { nome: string; os: string }>();
    projetos?.forEach((p) => {
      projectMap.set(p.id, { nome: p.nome, os: p.os });
    });
    const collabMap = new Map<string, string>();
    collaborators?.forEach((c) => {
      collabMap.set(c.id, c.full_name);
    });

    // Process ALL rows (including errors) for consolidated table
    for (const row of preview) {
      const dateStr = row.data_parsed ? formatDateDB(row.data_parsed) : '';
      const hasError = row.status_linha === 'ERRO';
      const hasWarning = row.status_linha === 'AVISO';
      
      // Get project info
      const projectInfo = row.projeto_id ? projectMap.get(row.projeto_id) : null;
      const collabName = row.colaborador_id ? collabMap.get(row.colaborador_id) : null;
      
      // Calculate total hours for consolidated record
      void (row.horas_normais + row.horas_50 + row.horas_100 + row.horas_noturnas); // totalHoras
      
      // Determine tipo_hora based on which has the most hours
      // @ts-ignore TS6133
      let tipoHora: 'NORMAL' | 'H50' | 'H100' | 'NOTURNA' = 'NORMAL';
      if (row.horas_50 > row.horas_normais && row.horas_50 > row.horas_100 && row.horas_50 > row.horas_noturnas) {
        tipoHora = 'H50';
      } else if (row.horas_100 > row.horas_normais && row.horas_100 > row.horas_noturnas) {
        tipoHora = 'H100';
      } else if (row.horas_noturnas > row.horas_normais) {
        tipoHora = 'NOTURNA';
      }

      // Insert individual records for each hour type into consolidated table
      const allHourTypes: { tipo: 'NORMAL' | 'H50' | 'H100' | 'NOTURNA'; horas: number }[] = [
        { tipo: 'NORMAL' as const, horas: row.horas_normais },
        { tipo: 'H50' as const, horas: row.horas_50 },
        { tipo: 'H100' as const, horas: row.horas_100 },
        { tipo: 'NOTURNA' as const, horas: row.horas_noturnas },
      ];
      const hourTypes = allHourTypes.filter(h => h.horas > 0);

      // If no hours, still create one record to track the error/warning
      if (hourTypes.length === 0) {
        hourTypes.push({ tipo: 'NORMAL', horas: 0 });
      }

      let ganttAtualizado = false;

      // Import both OK and AVISO rows (warnings are still importable)
      const canImport = !hasError && row.data_parsed && row.colaborador_id;
      
      if (canImport && row.projeto_id) {
        // Track dates for block creation (only when projeto_id exists)
        const blockKey = `${row.colaborador_id}_${row.projeto_id}`;
        if (!blocksMap.has(blockKey)) {
          blocksMap.set(blockKey, {
            colaborador_id: row.colaborador_id!,
            projeto_id: row.projeto_id!,
            dates: [],
          });
        }
        blocksMap.get(blockKey)!.dates.push(dateStr);
      }
      
      if (canImport) {
        // Upsert apontamentos_horas_dia (only if has projeto_id)
        if (row.projeto_id) {
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
              warning_sem_custo: hasWarning && row.codigo_erro_ou_aviso === 'SEM_CUSTO_VIGENTE',
              fonte: 'XLSX',
            }, {
              onConflict: 'cpf,data,projeto_id',
            });

          if (apontamentoError) {
          }
        }

        // Calculate and upsert custo_projeto_dia (only if has projeto_id)
        if (row.projeto_id) {
          if (row.custo_vigente) {
            const custoHora = row.custo_vigente.custo_hora;
            const custoNormal = row.horas_normais * custoHora;
            const custo50 = row.horas_50 * custoHora * MULT_50;
            const custo100 = row.horas_100 * custoHora * MULT_100;
            const custoNoturno = row.horas_noturnas * custoHora * MULT_NOTURNO;
            const custoTotal = custoNormal + custo50 + custo100 + custoNoturno;

            await supabase
              .from('custo_projeto_dia')
              .upsert({
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
              }, {
                onConflict: 'cpf,data,projeto_id',
              });
            okCount++;
          } else {
            await supabase
              .from('custo_projeto_dia')
              .upsert({
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
              }, {
                onConflict: 'cpf,data,projeto_id',
              });
            okCount++; // Still counts as success, just with warning
          }
          ganttAtualizado = true;
        } else {
          // Has hours but no OS - counts as warning/pending
          avisoCount++;
        }
      } else {
        erroCount++;
      }

      // Insert into apontamentos_consolidado
      for (const hourType of hourTypes) {
        await supabase
          .from('apontamentos_consolidado')
          .insert({
            origem: 'IMPORTACAO',
            arquivo_importacao_id: arquivoId,
            linha_arquivo: row.linha_csv,
            data_importacao: new Date().toISOString(),
            usuario_lancamento: user?.id,
            projeto_id: row.projeto_id || null,
            projeto_nome: projectInfo?.nome || null,
            os_numero: row.os || null,
            tarefa_id: null,
            tarefa_nome: null,
            centro_custo: null,
            funcionario_id: row.colaborador_id || null,
            cpf: row.cpf_limpo || row.cpf,
            nome_funcionario: collabName || null,
            data_apontamento: dateStr || row.data || '1900-01-01',
            horas: hourType.horas,
            tipo_hora: hourType.tipo,
            descricao: null,
            observacao: row.mensagem || null,
            status_apontamento: hasError ? 'PENDENTE' : (row.codigo_erro_ou_aviso === 'OS_PENDENTE' ? 'PENDENTE' : 'LANCADO'),
            status_integracao: hasError ? 'ERRO' : (row.codigo_erro_ou_aviso === 'OS_PENDENTE' ? 'PENDENTE' : 'OK'),
            motivo_erro: hasError ? row.mensagem : null,
            gantt_atualizado: ganttAtualizado,
            data_atualizacao_gantt: ganttAtualizado ? new Date().toISOString() : null,
          });
      }
    }

    // Create/update allocation blocks (tipo: 'realizado') for the Gantt chart
    for (const [, blockData] of blocksMap) {
      const sortedDates = blockData.dates.sort();
      const minDate = sortedDates[0];
      const maxDate = sortedDates[sortedDates.length - 1];

      // Check if there's an existing 'realizado' block that overlaps
      const { data: existingBlocks } = await supabase
        .from('alocacoes_blocos')
        .select('id, data_inicio, data_fim')
        .eq('colaborador_id', blockData.colaborador_id)
        .eq('projeto_id', blockData.projeto_id)
        .eq('tipo', 'realizado')
        .or(`and(data_inicio.lte.${maxDate},data_fim.gte.${minDate})`);

      if (existingBlocks && existingBlocks.length > 0) {
        // Expand existing block to cover all dates
        const allDates = [...sortedDates];
        existingBlocks.forEach(block => {
          allDates.push(block.data_inicio, block.data_fim);
        });
        allDates.sort();
        const newMinDate = allDates[0];
        const newMaxDate = allDates[allDates.length - 1];

        // Update the first block and delete others if there are multiple
        await supabase
          .from('alocacoes_blocos')
          .update({
            data_inicio: newMinDate,
            data_fim: newMaxDate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingBlocks[0].id);

        // Delete other overlapping blocks
        if (existingBlocks.length > 1) {
          const idsToDelete = existingBlocks.slice(1).map(b => b.id);
          await supabase
            .from('alocacoes_blocos')
            .delete()
            .in('id', idsToDelete);
        }
      } else {
        // Create new 'realizado' block
        await supabase
          .from('alocacoes_blocos')
          .insert({
            colaborador_id: blockData.colaborador_id,
            projeto_id: blockData.projeto_id,
            data_inicio: minDate,
            data_fim: maxDate,
            tipo: 'realizado',
            observacao: 'Criado via importação de apontamentos',
          });
      }
    }

    // Update arquivo_importacao with results
    await supabase
      .from('arquivos_importacao')
      .update({
        linhas_sucesso: okCount + avisoCount,
        linhas_erro: erroCount,
      })
      .eq('id', arquivoId);

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
      linha: row.linha_csv,
      cpf: row.cpf,
      data: row.data,
      os: row.os,
      status: row.status_linha,
      codigo: row.codigo_erro_ou_aviso || '',
      mensagem: row.mensagem,
    }));
  };

  const downloadReportXLSX = () => {
    const report = generateReport();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(report);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // linha
      { wch: 16 }, // cpf
      { wch: 12 }, // data
      { wch: 10 }, // os
      { wch: 8 },  // status
      { wch: 20 }, // codigo
      { wch: 50 }, // mensagem
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'relatorio');
    XLSX.writeFile(wb, `relatorio_importacao_${new Date().toISOString().split('T')[0]}.xlsx`);
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
          <h2 className="text-2xl font-semibold tracking-tight">Importar Apontamentos</h2>
          <p className="text-muted-foreground">Importe apontamentos de horas a partir de um arquivo Excel (.xlsx) ou CSV</p>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Formato do Arquivo</CardTitle>
            <CardDescription>
              O arquivo deve conter exatamente estas colunas. Para XLSX, use a aba <strong>"apontamentos"</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Colunas obrigatórias:</strong> cpf, data, os, horas_normais, horas_50, horas_100, horas_noturnas, falta_horas</p>
              <p><strong>Formatos aceitos:</strong></p>
              <ul className="list-disc list-inside ml-4">
                <li>CPF: com ou sem máscara (123.456.789-00 ou 12345678900)</li>
                <li>Data: data do Excel, DD/MM/AAAA ou YYYY-MM-DD</li>
                <li>Horas: hora Excel (08:00), HH:MM, ou decimal (8.5)</li>
                <li>OS: número único do projeto (texto ou número)</li>
              </ul>
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              <Button variant="default" onClick={downloadXLSXTemplate}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Baixar modelo XLSX
              </Button>
              <Button variant="outline" onClick={downloadCSVTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Baixar modelo CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upload */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8">
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Selecione um arquivo Excel (.xlsx) ou CSV
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="file-apontamentos-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="file-apontamentos-upload" className="cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
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
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={downloadReportXLSX}>
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
                        <TableCell>{row.data}</TableCell>
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
