import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useBudgetLaborCatalog, type BudgetLaborCatalogItem } from './useBudgetLaborCatalog';
import { useBudgetLaborChargeSets } from './useBudgetLaborChargeSets';
import { useBudgetLaborGroups, useBudgetLaborCategories, useBudgetLaborTags } from './useBudgetLaborTaxonomy';

const COLUMN_ALIASES: Record<string, string[]> = {
  codigo: ['codigo', 'código', 'code', 'cod', 'id'],
  nome: ['nome', 'função', 'funcao', 'descricao', 'descrição', 'name', 'description'],
  tipo_mo: ['tipo_mo', 'tipo', 'type', 'mod_moi', 'mod/moi'],
  regime: ['regime', 'contrato', 'contratação', 'clt_pl', 'clt/pl'],
  carga_horaria_mensal: ['carga_horaria_mensal', 'carga_horaria', 'carga horária', 'horas_mes', 'horas/mês'],
  salario_base: ['salario_base', 'salário base', 'salario', 'salário', 'base'],
  beneficios_mensal: ['beneficios_mensal', 'benefícios', 'beneficios', 'benefits'],
  periculosidade_pct: ['periculosidade_pct', 'periculosidade', '%_periculosidade'],
  insalubridade_pct: ['insalubridade_pct', 'insalubridade', '%_insalubridade'],
  charge_set: ['charge_set', 'encargos', 'encargos_set', 'conjunto_encargos'],
  produtividade_valor: ['produtividade_valor', 'produtividade', 'productivity'],
  produtividade_tipo: ['produtividade_tipo', 'tipo_produtividade'],
  produtividade_unidade: ['produtividade_unidade', 'unidade_produtividade', 'unidade_prod'],
  group: ['group', 'grupo', 'group_nome'],
  category: ['category', 'categoria', 'category_nome'],
  tags: ['tags', 'etiquetas', 'marcadores'],
  observacao: ['observacao', 'observação', 'obs', 'notas', 'notes'],
};

export type ImportRowStatus = 'NEW' | 'UPDATE' | 'EQUAL' | 'ERROR';

export interface ImportPreviewRow {
  rowIndex: number;
  status: ImportRowStatus;
  codigo: string;
  nome: string;
  tipo_mo: string;
  regime: string;
  salario_base: number;
  hh_custo_preview?: number;
  errors: string[];
  rawData: Record<string, any>;
  existingId?: string;
}

export interface ImportSummary {
  total: number;
  new: number;
  update: number;
  equal: number;
  error: number;
}

export interface ColumnMapping {
  [key: string]: string;
}

export function useBudgetLaborCatalogImport() {
  const queryClient = useQueryClient();
  const { items: existingItems } = useBudgetLaborCatalog();
  const { chargeSets } = useBudgetLaborChargeSets();
  const { groups, upsertGroup } = useBudgetLaborGroups();
  const { allCategories, upsertCategory } = useBudgetLaborCategories();
  const { tags, upsertTag } = useBudgetLaborTags();

  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  const detectColumnMapping = (fileHeaders: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {};
    
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      const match = fileHeaders.find(h => 
        aliases.some(alias => h.toLowerCase().trim() === alias.toLowerCase())
      );
      if (match) {
        mapping[field] = match;
      }
    }
    
    return mapping;
  };

  const parseFile = async (file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length < 2) {
            reject(new Error('Arquivo deve ter pelo menos um cabeçalho e uma linha de dados'));
            return;
          }

          const fileHeaders = (jsonData[0] || []).map((h: any) => String(h || '').trim());
          const rows = jsonData.slice(1).filter(row => row.some(cell => cell != null && cell !== ''));
          
          const parsedRows = rows.map(row => {
            const obj: Record<string, any> = {};
            fileHeaders.forEach((header, idx) => {
              obj[header] = row[idx];
            });
            return obj;
          });

          resolve({ headers: fileHeaders, rows: parsedRows });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  const generatePreview = useCallback((data: Record<string, any>[], mapping: ColumnMapping): ImportPreviewRow[] => {
    const codigosSeen = new Set<string>();
    const existingByCodigo = new Map(existingItems.map(item => [item.codigo.toLowerCase(), item]));

    return data.map((row, index) => {
      const errors: string[] = [];
      
      // Extract values using mapping
      const codigo = String(row[mapping.codigo] || '').trim();
      const nome = String(row[mapping.nome] || '').trim();
      const tipoMoRaw = String(row[mapping.tipo_mo] || 'MOD').toUpperCase().trim();
      const regimeRaw = String(row[mapping.regime] || 'CLT').toUpperCase().trim();
      const salarioBase = parseFloat(String(row[mapping.salario_base] || '0').replace(',', '.')) || 0;
      
      // Validate required fields
      if (!codigo) errors.push('Código obrigatório');
      if (!nome) errors.push('Nome obrigatório');
      
      // Validate tipo_mo
      const tipo_mo = tipoMoRaw === 'MOI' ? 'MOI' : 'MOD';
      
      // Validate regime
      const regime = regimeRaw === 'PL' || regimeRaw === 'PJ' ? 'PL' : 'CLT';
      
      // Validate salario
      if (salarioBase < 0) errors.push('Salário não pode ser negativo');
      
      // Check for duplicates in file
      if (codigo && codigosSeen.has(codigo.toLowerCase())) {
        errors.push('Código duplicado no arquivo');
      }
      codigosSeen.add(codigo.toLowerCase());

      // Determine status
      let status: ImportRowStatus = 'NEW';
      let existingId: string | undefined;
      
      if (errors.length > 0) {
        status = 'ERROR';
      } else if (codigo) {
        const existing = existingByCodigo.get(codigo.toLowerCase());
        if (existing) {
          existingId = existing.id;
          // Check if any field is different
          const isDifferent = 
            existing.nome !== nome ||
            existing.tipo_mo !== tipo_mo ||
            existing.regime !== regime ||
            existing.salario_base !== salarioBase;
          
          status = isDifferent ? 'UPDATE' : 'EQUAL';
        }
      }

      return {
        rowIndex: index + 2, // Excel row (1-indexed + header)
        status,
        codigo,
        nome,
        tipo_mo,
        regime,
        salario_base: salarioBase,
        errors,
        rawData: row,
        existingId,
      };
    });
  }, [existingItems]);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const { headers: fileHeaders, rows } = await parseFile(file);
      const mapping = detectColumnMapping(fileHeaders);
      
      if (!mapping.codigo) {
        toast.error('Coluna "código" não encontrada no arquivo');
        return;
      }
      if (!mapping.nome) {
        toast.error('Coluna "nome" não encontrada no arquivo');
        return;
      }

      setHeaders(fileHeaders);
      setRawData(rows);
      setColumnMapping(mapping);
      
      const previewRows = generatePreview(rows, mapping);
      setPreview(previewRows);
      
      const summaryData: ImportSummary = {
        total: previewRows.length,
        new: previewRows.filter(r => r.status === 'NEW').length,
        update: previewRows.filter(r => r.status === 'UPDATE').length,
        equal: previewRows.filter(r => r.status === 'EQUAL').length,
        error: previewRows.filter(r => r.status === 'ERROR').length,
      };
      setSummary(summaryData);

    } catch (error: any) {
      toast.error(`Erro ao processar arquivo: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyImport = async (): Promise<boolean> => {
    const toProcess = preview.filter(r => r.status === 'NEW' || r.status === 'UPDATE');
    
    if (toProcess.length === 0) {
      toast.info('Nenhum item para importar');
      return false;
    }

    if (preview.some(r => r.status === 'ERROR')) {
      toast.error('Corrija os erros antes de aplicar a importação');
      return false;
    }

    setIsProcessing(true);
    let createdCount = 0;
    let updatedCount = 0;

    try {
      // Create import run record
      const { data: importRun } = await supabase
        .from('budget_labor_import_runs')
        .insert({
          filename: 'import',
          total_rows: preview.length,
        })
        .select()
        .single();

      for (const row of toProcess) {
        const mapping = columnMapping;
        
        // Parse all fields
        const cargaHoraria = parseFloat(String(row.rawData[mapping.carga_horaria_mensal] || '220').replace(',', '.')) || 220;
        const beneficios = parseFloat(String(row.rawData[mapping.beneficios_mensal] || '0').replace(',', '.')) || 0;
        const periculosidade = parseFloat(String(row.rawData[mapping.periculosidade_pct] || '0').replace(',', '.')) || 0;
        const insalubridade = parseFloat(String(row.rawData[mapping.insalubridade_pct] || '0').replace(',', '.')) || 0;
        const prodValor = row.rawData[mapping.produtividade_valor] 
          ? parseFloat(String(row.rawData[mapping.produtividade_valor]).replace(',', '.')) 
          : null;
        const prodTipo = String(row.rawData[mapping.produtividade_tipo] || 'HH_POR_UN').toUpperCase();
        const prodUnidade = row.rawData[mapping.produtividade_unidade] 
          ? String(row.rawData[mapping.produtividade_unidade]).trim() 
          : null;
        const observacao = row.rawData[mapping.observacao] 
          ? String(row.rawData[mapping.observacao]).trim() 
          : null;

        // Handle group/category
        let groupId: string | null = null;
        let categoryId: string | null = null;
        
        if (mapping.group && row.rawData[mapping.group]) {
          groupId = await upsertGroup(String(row.rawData[mapping.group]).trim());
        }
        if (mapping.category && row.rawData[mapping.category]) {
          categoryId = await upsertCategory(String(row.rawData[mapping.category]).trim(), groupId || undefined);
        }

        // Handle charge set by name
        let chargeSetId: string | null = null;
        if (mapping.charge_set && row.rawData[mapping.charge_set]) {
          const chargeSetName = String(row.rawData[mapping.charge_set]).trim().toLowerCase();
          const matchingSet = chargeSets.find(cs => cs.nome.toLowerCase() === chargeSetName);
          if (matchingSet) chargeSetId = matchingSet.id;
        }

        const prodTipoValue: 'HH_POR_UN' | 'UN_POR_HH' = prodTipo === 'UN_POR_HH' ? 'UN_POR_HH' : 'HH_POR_UN';
        
        const itemData = {
          codigo: row.codigo,
          nome: row.nome,
          tipo_mo: row.tipo_mo as 'MOD' | 'MOI',
          regime: row.regime as 'CLT' | 'PL',
          carga_horaria_mensal: cargaHoraria,
          salario_base: row.salario_base,
          beneficios_mensal: beneficios,
          periculosidade_pct: periculosidade,
          insalubridade_pct: insalubridade,
          charge_set_id: chargeSetId,
          produtividade_valor: prodValor,
          produtividade_tipo: prodTipoValue,
          produtividade_unidade: prodUnidade,
          group_id: groupId,
          category_id: categoryId,
          observacao,
          ativo: true,
        };

        if (row.status === 'NEW') {
          const { error } = await supabase
            .from('budget_labor_roles_catalog')
            .insert([itemData]);
          
          if (error) throw error;
          createdCount++;
        } else if (row.status === 'UPDATE' && row.existingId) {
          const { error } = await supabase
            .from('budget_labor_roles_catalog')
            .update(itemData)
            .eq('id', row.existingId);
          
          if (error) throw error;
          updatedCount++;
        }

        // Handle tags
        if (mapping.tags && row.rawData[mapping.tags]) {
          const tagNames = String(row.rawData[mapping.tags])
            .split(/[,;]/)
            .map(t => t.trim())
            .filter(Boolean);
          
          if (tagNames.length > 0) {
            // Get the role ID
            const { data: roleData } = await supabase
              .from('budget_labor_roles_catalog')
              .select('id')
              .eq('codigo', row.codigo)
              .single();

            if (roleData) {
              const tagIds: string[] = [];
              for (const tagName of tagNames.slice(0, 5)) { // Max 5 tags
                const tagId = await upsertTag(tagName);
                tagIds.push(tagId);
              }

              // Delete existing and insert new
              await supabase
                .from('budget_labor_catalog_tags')
                .delete()
                .eq('role_id', roleData.id);

              if (tagIds.length > 0) {
                await supabase
                  .from('budget_labor_catalog_tags')
                  .insert(tagIds.map(tagId => ({ role_id: roleData.id, tag_id: tagId })));
              }
            }
          }
        }
      }

      // Update import run
      if (importRun) {
        await supabase
          .from('budget_labor_import_runs')
          .update({
            created_count: createdCount,
            updated_count: updatedCount,
          })
          .eq('id', importRun.id);
      }

      queryClient.invalidateQueries({ queryKey: ['budget-labor-catalog'] });
      toast.success(`Importação concluída: ${createdCount} criados, ${updatedCount} atualizados`);
      return true;

    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setPreview([]);
    setSummary(null);
    setColumnMapping({});
    setRawData([]);
    setHeaders([]);
  };

  const updateMapping = (field: string, column: string) => {
    const newMapping = { ...columnMapping, [field]: column };
    setColumnMapping(newMapping);
    setPreview(generatePreview(rawData, newMapping));
    
    const previewRows = generatePreview(rawData, newMapping);
    setSummary({
      total: previewRows.length,
      new: previewRows.filter(r => r.status === 'NEW').length,
      update: previewRows.filter(r => r.status === 'UPDATE').length,
      equal: previewRows.filter(r => r.status === 'EQUAL').length,
      error: previewRows.filter(r => r.status === 'ERROR').length,
    });
  };

  const downloadTemplate = () => {
    const template = [
      {
        codigo: 'MOD-ELET-001',
        nome: 'Eletricista I',
        tipo_mo: 'MOD',
        regime: 'CLT',
        carga_horaria_mensal: 220,
        salario_base: 3500,
        beneficios_mensal: 800,
        periculosidade_pct: 30,
        insalubridade_pct: 0,
        encargos: 'CLT Padrão',
        produtividade_valor: 0.5,
        produtividade_tipo: 'HH_POR_UN',
        produtividade_unidade: 'ponto',
        grupo: 'Elétrica',
        categoria: 'Produção',
        tags: 'industrial, campo',
        observacao: 'Função para instalações elétricas',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_funcoes_mo.xlsx');
  };

  return {
    isProcessing,
    preview,
    summary,
    columnMapping,
    headers,
    processFile,
    applyImport,
    reset,
    updateMapping,
    downloadTemplate,
  };
}
