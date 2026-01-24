import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// Column aliases for flexible mapping
const COLUMN_ALIASES: Record<string, string[]> = {
  codigo: ['codigo', 'código', 'cod', 'code', 'sku', 'id'],
  descricao: ['descricao', 'descrição', 'desc', 'description', 'nome', 'name', 'material'],
  unidade: ['unidade', 'un', 'und', 'unit', 'uom'],
  preco_ref: ['preco_ref', 'preço_ref', 'preco', 'preço', 'price', 'valor', 'custo', 'cost'],
  hh_ref: ['hh_ref', 'hh', 'hh_unit', 'hh_unitario', 'homem_hora'],
  categoria: ['categoria', 'category', 'grupo', 'group', 'tipo', 'type'],
};

export type ImportRowStatus = 'NOVO' | 'UPDATE_PRECO' | 'IGUAL' | 'ERRO';

export interface ImportPreviewRow {
  rowNumber: number;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_ref: number | null;
  hh_ref: number | null;
  categoria: string | null;
  status: ImportRowStatus;
  errorMessage?: string;
  existingId?: string;
  existingPreco?: number | null;
  existingDescricao?: string;
  existingUnidade?: string;
  existingHhRef?: number | null;
  existingCategoria?: string | null;
}

export interface ImportSummary {
  total: number;
  novos: number;
  updates: number;
  iguais: number;
  erros: number;
}

export interface ColumnMapping {
  codigo: number;
  descricao: number;
  unidade: number;
  preco_ref: number;
  hh_ref?: number;
  categoria?: number;
}

export interface DuplicateInfo {
  codigo: string;
  lines: number[];
}

export function useMaterialCatalogImport() {
  const { user, hasRole, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  // Check if user can import (admin, financeiro, or super_admin)
  const canImport = hasRole('admin') || hasRole('financeiro') || isSuperAdmin();
  
  // Check if user can do full update (only super_admin)
  const canFullUpdate = isSuperAdmin();

  // Auto-detect column mapping based on headers
  const detectColumnMapping = useCallback((headerRow: string[]): Partial<ColumnMapping> => {
    const mapping: Partial<ColumnMapping> = {};
    const normalizedHeaders = headerRow.map(h => h?.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '');

    Object.entries(COLUMN_ALIASES).forEach(([field, aliases]) => {
      const index = normalizedHeaders.findIndex(h => 
        aliases.some(alias => h === alias.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      );
      if (index !== -1) {
        (mapping as any)[field] = index;
      }
    });

    return mapping;
  }, []);

  // Parse file (CSV or XLSX)
  const parseFile = useCallback(async (file: File): Promise<{ headers: string[]; data: string[][] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });
            
            const headers = (jsonData[0] || []).map(h => String(h || ''));
            const rows = jsonData.slice(1).map(row => 
              Array.isArray(row) ? row.map(cell => String(cell ?? '')) : []
            ).filter(row => row.some(cell => cell.trim()));
            
            resolve({ headers, data: rows });
          } catch (err) {
            reject(new Error('Erro ao processar arquivo Excel'));
          }
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());
            const parseCSVLine = (line: string): string[] => {
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
            };
            
            const headers = parseCSVLine(lines[0]);
            const rows = lines.slice(1).map(line => parseCSVLine(line)).filter(row => row.some(cell => cell.trim()));
            
            resolve({ headers, data: rows });
          } catch (err) {
            reject(new Error('Erro ao processar arquivo CSV'));
          }
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsText(file, 'UTF-8');
      }
    });
  }, []);

  // Process file and generate preview
  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setPreview([]);
    setSummary(null);
    setDuplicates([]);

    try {
      const { headers: fileHeaders, data } = await parseFile(file);
      setHeaders(fileHeaders);
      setRawData(data);

      const detectedMapping = detectColumnMapping(fileHeaders);
      
      // Check required columns
      if (detectedMapping.codigo === undefined || 
          detectedMapping.descricao === undefined || 
          detectedMapping.unidade === undefined ||
          detectedMapping.preco_ref === undefined) {
        toast.error('Colunas obrigatórias não encontradas: codigo, descricao, unidade, preco_ref');
        setColumnMapping(null);
        setIsProcessing(false);
        return;
      }

      setColumnMapping(detectedMapping as ColumnMapping);
      await generatePreview(data, detectedMapping as ColumnMapping);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao processar arquivo');
    } finally {
      setIsProcessing(false);
    }
  }, [parseFile, detectColumnMapping]);

  // Generate preview with validation
  const generatePreview = useCallback(async (data: string[][], mapping: ColumnMapping) => {
    setIsProcessing(true);

    try {
      // Check for duplicates in file
      const codigoOccurrences = new Map<string, number[]>();
      data.forEach((row, idx) => {
        const codigo = row[mapping.codigo]?.trim() || '';
        if (codigo) {
          const existing = codigoOccurrences.get(codigo) || [];
          existing.push(idx + 2); // +2 because row 1 is header, and we want 1-indexed
          codigoOccurrences.set(codigo, existing);
        }
      });

      const duplicatesList: DuplicateInfo[] = [];
      codigoOccurrences.forEach((lines, codigo) => {
        if (lines.length > 1) {
          duplicatesList.push({ codigo, lines });
        }
      });

      if (duplicatesList.length > 0) {
        setDuplicates(duplicatesList);
        setSummary({ total: data.length, novos: 0, updates: 0, iguais: 0, erros: data.length });
        setIsProcessing(false);
        return;
      }

      setDuplicates([]);

      // Fetch existing catalog items
      const { data: existingItems, error: fetchError } = await supabase
        .from('material_catalog')
        .select('id, codigo, descricao, unidade, preco_ref, hh_unit_ref, categoria');

      if (fetchError) throw fetchError;

      const existingMap = new Map(existingItems?.map(item => [item.codigo.toLowerCase(), item]) || []);

      // Process each row
      const previewRows: ImportPreviewRow[] = [];
      let novos = 0, updates = 0, iguais = 0, erros = 0;

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2;

        const codigo = row[mapping.codigo]?.trim() || '';
        const descricao = row[mapping.descricao]?.trim() || '';
        const unidade = row[mapping.unidade]?.trim() || '';
        const precoStr = row[mapping.preco_ref]?.replace(',', '.').trim() || '';
        const preco_ref = precoStr ? parseFloat(precoStr) : null;
        const hh_ref = mapping.hh_ref !== undefined ? 
          (row[mapping.hh_ref]?.replace(',', '.').trim() ? parseFloat(row[mapping.hh_ref].replace(',', '.')) : null) : null;
        const categoria = mapping.categoria !== undefined ? 
          (row[mapping.categoria]?.trim() || null) : null;

        // Validation
        let status: ImportRowStatus = 'NOVO';
        let errorMessage: string | undefined;

        if (!codigo) {
          status = 'ERRO';
          errorMessage = 'Código vazio';
          erros++;
        } else if (!descricao) {
          status = 'ERRO';
          errorMessage = 'Descrição vazia';
          erros++;
        } else if (!unidade) {
          status = 'ERRO';
          errorMessage = 'Unidade vazia';
          erros++;
        } else if (preco_ref !== null && (isNaN(preco_ref) || preco_ref < 0)) {
          status = 'ERRO';
          errorMessage = 'Preço inválido (deve ser >= 0)';
          erros++;
        } else {
          const existing = existingMap.get(codigo.toLowerCase());
          if (existing) {
            const existingPreco = existing.preco_ref ?? 0;
            const newPreco = preco_ref ?? 0;
            
            if (Math.abs(existingPreco - newPreco) > 0.001) {
              status = 'UPDATE_PRECO';
              updates++;
            } else {
              status = 'IGUAL';
              iguais++;
            }

            previewRows.push({
              rowNumber,
              codigo,
              descricao,
              unidade,
              preco_ref,
              hh_ref,
              categoria,
              status,
              errorMessage,
              existingId: existing.id,
              existingPreco: existing.preco_ref,
              existingDescricao: existing.descricao,
              existingUnidade: existing.unidade,
              existingHhRef: existing.hh_unit_ref,
              existingCategoria: existing.categoria,
            });
            continue;
          } else {
            novos++;
          }
        }

        previewRows.push({
          rowNumber,
          codigo,
          descricao,
          unidade,
          preco_ref,
          hh_ref,
          categoria,
          status,
          errorMessage,
        });
      }

      setPreview(previewRows);
      setSummary({ total: data.length, novos, updates, iguais, erros });
    } catch (error) {
      toast.error('Erro ao gerar prévia');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Apply import
  const applyImport = useCallback(async (fullUpdate: boolean = false): Promise<boolean> => {
    if (!canImport) {
      toast.error('Sem permissão para importar');
      return false;
    }

    if (duplicates.length > 0) {
      toast.error('Corrija os códigos duplicados antes de aplicar');
      return false;
    }

    if (!summary || summary.erros > 0) {
      toast.error('Corrija os erros antes de aplicar');
      return false;
    }

    if (fullUpdate && !canFullUpdate) {
      toast.error('Apenas Super Admin pode fazer atualização completa');
      return false;
    }

    setIsProcessing(true);

    try {
      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from('arquivos_importacao')
        .insert({
          nome_arquivo: 'catalogo_materiais_import',
          tipo_arquivo: 'XLSX',
          tipo: 'CATALOGO_MATERIAIS',
          total_linhas: summary.total,
          linhas_sucesso: 0,
          linhas_erro: summary.erros,
          usuario_id: user?.id,
          resumo_json: {
            novos: summary.novos,
            updates: summary.updates,
            iguais: summary.iguais,
            erros: summary.erros,
          },
        })
        .select('id')
        .single();

      if (importError) throw importError;

      const importRunId = importRecord.id;
      let successCount = 0;

      // Process new items
      const newItems = preview.filter(row => row.status === 'NOVO');
      if (newItems.length > 0) {
        const insertData = newItems.map(item => ({
          codigo: item.codigo,
          descricao: item.descricao,
          unidade: item.unidade,
          preco_ref: item.preco_ref ?? 0,
          hh_unit_ref: fullUpdate && canFullUpdate ? (item.hh_ref ?? 0) : 0,
          categoria: fullUpdate && canFullUpdate ? item.categoria : null,
          ativo: true,
        }));

        const { error: insertError } = await supabase
          .from('material_catalog')
          .insert(insertData);

        if (insertError) throw insertError;
        successCount += newItems.length;
      }

      // Process updates
      const updateItems = preview.filter(row => row.status === 'UPDATE_PRECO');
      for (const item of updateItems) {
        if (!item.existingId) continue;

        // Record price history
        await supabase
          .from('material_catalog_price_history')
          .insert({
            catalog_id: item.existingId,
            codigo: item.codigo,
            old_price: item.existingPreco ?? 0,
            new_price: item.preco_ref ?? 0,
            changed_by: user?.id,
            import_run_id: importRunId,
          });

        // Update catalog item
        const updateData: Record<string, any> = {
          preco_ref: item.preco_ref ?? 0,
        };

        if (fullUpdate && canFullUpdate) {
          updateData.descricao = item.descricao;
          updateData.unidade = item.unidade;
          updateData.hh_unit_ref = item.hh_ref ?? 0;
          updateData.categoria = item.categoria;
        }

        await supabase
          .from('material_catalog')
          .update(updateData)
          .eq('id', item.existingId);

        successCount++;
      }

      // Update import record with success count
      await supabase
        .from('arquivos_importacao')
        .update({ linhas_sucesso: successCount })
        .eq('id', importRunId);

      // Invalidate catalog query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['material-catalog'] });

      toast.success(`Importação concluída: ${summary.novos} novos, ${summary.updates} atualizados`);
      return true;
    } catch (error) {
      toast.error('Erro ao aplicar importação');
      console.error(error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [canImport, canFullUpdate, duplicates, summary, preview, user?.id]);

  // Reset state
  const reset = useCallback(() => {
    setPreview([]);
    setSummary(null);
    setDuplicates([]);
    setColumnMapping(null);
    setRawData([]);
    setHeaders([]);
  }, []);

  // Update column mapping manually
  const updateMapping = useCallback((newMapping: ColumnMapping) => {
    setColumnMapping(newMapping);
    if (rawData.length > 0) {
      generatePreview(rawData, newMapping);
    }
  }, [rawData, generatePreview]);

  // Generate template file
  const downloadTemplate = useCallback(() => {
    const templateData = [
      ['codigo', 'descricao', 'unidade', 'preco_ref', 'hh_ref', 'categoria'],
      ['MAT-001', 'Cabo PP 3x2.5mm²', 'm', '12.50', '0.05', 'Cabos'],
      ['MAT-002', 'Disjuntor 3P 100A', 'pç', '450.00', '0.25', 'Proteção'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Materiais');
    XLSX.writeFile(wb, 'template_catalogo_materiais.xlsx');
  }, []);

  return {
    isProcessing,
    preview,
    summary,
    duplicates,
    columnMapping,
    headers,
    canImport,
    canFullUpdate,
    processFile,
    applyImport,
    reset,
    updateMapping,
    downloadTemplate,
  };
}
