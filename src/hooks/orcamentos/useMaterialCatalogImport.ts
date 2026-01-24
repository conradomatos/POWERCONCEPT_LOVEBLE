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
  grupo: ['grupo', 'group', 'grupo_nome'],
  categoria: ['categoria', 'category', 'categoria_nome'],
  subcategoria: ['subcategoria', 'subcategory', 'sub_categoria', 'sub'],
  tags: ['tags', 'etiquetas', 'labels'],
};

export type ImportRowStatus = 'NOVO' | 'UPDATE_PRECO' | 'IGUAL' | 'CONFLITO' | 'ERRO';

export interface ImportPreviewRow {
  rowNumber: number;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_ref: number | null;
  hh_ref: number | null;
  grupo: string | null;
  categoria: string | null;
  subcategoria: string | null;
  tags: string[];
  status: ImportRowStatus;
  errorMessage?: string;
  conflictFields?: string[];
  existingId?: string;
  existingPreco?: number | null;
  existingDescricao?: string;
  existingUnidade?: string;
  existingHhRef?: number | null;
  existingGrupo?: string | null;
  existingCategoria?: string | null;
  existingSubcategoria?: string | null;
}

export interface ImportSummary {
  total: number;
  novos: number;
  updates: number;
  iguais: number;
  conflitos: number;
  erros: number;
}

export interface ColumnMapping {
  codigo: number;
  descricao: number;
  unidade: number;
  preco_ref: number;
  hh_ref?: number;
  grupo?: number;
  categoria?: number;
  subcategoria?: number;
  tags?: number;
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

  // Parse tags from string (separated by ; or ,)
  const parseTags = (value: string | undefined): string[] => {
    if (!value) return [];
    return value
      .split(/[;,]/)
      .map(t => t.trim())
      .filter(t => t.length > 0);
  };

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
          existing.push(idx + 2);
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
        setSummary({ total: data.length, novos: 0, updates: 0, iguais: 0, conflitos: 0, erros: data.length });
        setIsProcessing(false);
        return;
      }

      setDuplicates([]);

      // Fetch existing catalog items with relations
      const { data: existingItems, error: fetchError } = await supabase
        .from('material_catalog')
        .select(`
          id, codigo, descricao, unidade, preco_ref, hh_unit_ref,
          group:material_groups(nome),
          category:material_categories(nome),
          subcategory:material_subcategories(nome)
        `);

      if (fetchError) throw fetchError;

      const existingMap = new Map(existingItems?.map(item => [
        item.codigo.toLowerCase(),
        {
          ...item,
          grupo: item.group?.nome || null,
          categoria: item.category?.nome || null,
          subcategoria: item.subcategory?.nome || null,
        }
      ]) || []);

      // Process each row
      const previewRows: ImportPreviewRow[] = [];
      let novos = 0, updates = 0, iguais = 0, conflitos = 0, erros = 0;

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
        const grupo = mapping.grupo !== undefined ? (row[mapping.grupo]?.trim() || null) : null;
        const categoria = mapping.categoria !== undefined ? (row[mapping.categoria]?.trim() || null) : null;
        const subcategoria = mapping.subcategoria !== undefined ? (row[mapping.subcategoria]?.trim() || null) : null;
        const tags = mapping.tags !== undefined ? parseTags(row[mapping.tags]) : [];

        // Validation
        let status: ImportRowStatus = 'NOVO';
        let errorMessage: string | undefined;
        let conflictFields: string[] | undefined;

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
            
            // Check for conflicts (different descricao/unidade)
            const conflicts: string[] = [];
            if (descricao.toLowerCase() !== existing.descricao.toLowerCase()) {
              conflicts.push('Descrição');
            }
            if (unidade.toLowerCase() !== existing.unidade.toLowerCase()) {
              conflicts.push('Unidade');
            }

            if (conflicts.length > 0 && !canFullUpdate) {
              status = 'CONFLITO';
              conflictFields = conflicts;
              conflitos++;
            } else if (Math.abs(existingPreco - newPreco) > 0.001) {
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
              grupo,
              categoria,
              subcategoria,
              tags,
              status,
              errorMessage,
              conflictFields,
              existingId: existing.id,
              existingPreco: existing.preco_ref,
              existingDescricao: existing.descricao,
              existingUnidade: existing.unidade,
              existingHhRef: existing.hh_unit_ref,
              existingGrupo: existing.grupo,
              existingCategoria: existing.categoria,
              existingSubcategoria: existing.subcategoria,
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
          grupo,
          categoria,
          subcategoria,
          tags,
          status,
          errorMessage,
          conflictFields,
        });
      }

      setPreview(previewRows);
      setSummary({ total: data.length, novos, updates, iguais, conflitos, erros });
    } catch (error) {
      toast.error('Erro ao gerar prévia');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  }, [canFullUpdate]);

  // Upsert group/category/subcategory
  const upsertHierarchy = async (grupo: string | null, categoria: string | null, subcategoria: string | null): Promise<{
    group_id: string | null;
    category_id: string | null;
    subcategory_id: string | null;
  }> => {
    let group_id: string | null = null;
    let category_id: string | null = null;
    let subcategory_id: string | null = null;

    if (grupo) {
      // Try to find or create group
      const { data: existingGroup } = await supabase
        .from('material_groups')
        .select('id')
        .ilike('nome', grupo)
        .single();

      if (existingGroup) {
        group_id = existingGroup.id;
      } else {
        const { data: newGroup, error } = await supabase
          .from('material_groups')
          .insert({ nome: grupo })
          .select('id')
          .single();
        if (!error && newGroup) {
          group_id = newGroup.id;
        }
      }

      if (group_id && categoria) {
        // Try to find or create category
        const { data: existingCategory } = await supabase
          .from('material_categories')
          .select('id')
          .eq('group_id', group_id)
          .ilike('nome', categoria)
          .single();

        if (existingCategory) {
          category_id = existingCategory.id;
        } else {
          const { data: newCategory, error } = await supabase
            .from('material_categories')
            .insert({ group_id, nome: categoria })
            .select('id')
            .single();
          if (!error && newCategory) {
            category_id = newCategory.id;
          }
        }

        if (category_id && subcategoria) {
          // Try to find or create subcategory
          const { data: existingSubcategory } = await supabase
            .from('material_subcategories')
            .select('id')
            .eq('category_id', category_id)
            .ilike('nome', subcategoria)
            .single();

          if (existingSubcategory) {
            subcategory_id = existingSubcategory.id;
          } else {
            const { data: newSubcategory, error } = await supabase
              .from('material_subcategories')
              .insert({ category_id, nome: subcategoria })
              .select('id')
              .single();
            if (!error && newSubcategory) {
              subcategory_id = newSubcategory.id;
            }
          }
        }
      }
    }

    return { group_id, category_id, subcategory_id };
  };

  // Upsert tags
  const upsertTags = async (tagNames: string[]): Promise<string[]> => {
    if (tagNames.length === 0) return [];

    const tagIds: string[] = [];

    for (const nome of tagNames) {
      const { data: existing } = await supabase
        .from('material_tags')
        .select('id')
        .ilike('nome', nome)
        .single();

      if (existing) {
        tagIds.push(existing.id);
      } else {
        const { data: newTag, error } = await supabase
          .from('material_tags')
          .insert({ nome })
          .select('id')
          .single();
        if (!error && newTag) {
          tagIds.push(newTag.id);
        }
      }
    }

    return tagIds;
  };

  // Set tags for a material
  const setMaterialTags = async (materialId: string, tagIds: string[]) => {
    // Delete existing
    await supabase
      .from('material_catalog_tags')
      .delete()
      .eq('material_id', materialId);

    // Insert new
    if (tagIds.length > 0) {
      await supabase
        .from('material_catalog_tags')
        .insert(tagIds.map(tag_id => ({ material_id: materialId, tag_id })));
    }
  };

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

    if (summary.conflitos > 0 && !fullUpdate) {
      toast.error('Existem conflitos. Super Admin pode optar por sobrescrever.');
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
            conflitos: summary.conflitos,
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
      for (const item of newItems) {
        const hierarchy = await upsertHierarchy(item.grupo, item.categoria, item.subcategoria);
        const tagIds = await upsertTags(item.tags);

        const { data: newMaterial, error: insertError } = await supabase
          .from('material_catalog')
          .insert({
            codigo: item.codigo,
            descricao: item.descricao,
            unidade: item.unidade,
            preco_ref: item.preco_ref ?? 0,
            hh_unit_ref: item.hh_ref ?? 0,
            group_id: hierarchy.group_id,
            category_id: hierarchy.category_id,
            subcategory_id: hierarchy.subcategory_id,
            ativo: true,
          })
          .select('id')
          .single();

        if (!insertError && newMaterial && tagIds.length > 0) {
          await setMaterialTags(newMaterial.id, tagIds);
        }

        if (!insertError) successCount++;
      }

      // Process updates (price only for regular users, full for super_admin)
      const updateItems = preview.filter(row => row.status === 'UPDATE_PRECO' || (row.status === 'CONFLITO' && fullUpdate));
      for (const item of updateItems) {
        if (!item.existingId) continue;

        // Record price history if price changed
        const oldPrice = item.existingPreco ?? 0;
        const newPrice = item.preco_ref ?? 0;
        if (Math.abs(oldPrice - newPrice) > 0.001) {
          await supabase
            .from('material_catalog_price_history')
            .insert({
              catalog_id: item.existingId,
              codigo: item.codigo,
              old_price: oldPrice,
              new_price: newPrice,
              changed_by: user?.id,
              import_run_id: importRunId,
            });
        }

        // Build update data
        const updateData: Record<string, any> = {
          preco_ref: item.preco_ref ?? 0,
        };

        if (fullUpdate && canFullUpdate) {
          updateData.descricao = item.descricao;
          updateData.unidade = item.unidade;
          updateData.hh_unit_ref = item.hh_ref ?? 0;

          // Update hierarchy
          const hierarchy = await upsertHierarchy(item.grupo, item.categoria, item.subcategoria);
          updateData.group_id = hierarchy.group_id;
          updateData.category_id = hierarchy.category_id;
          updateData.subcategory_id = hierarchy.subcategory_id;

          // Update tags
          const tagIds = await upsertTags(item.tags);
          await setMaterialTags(item.existingId, tagIds);
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

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['material-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['material-groups'] });
      queryClient.invalidateQueries({ queryKey: ['material-categories'] });
      queryClient.invalidateQueries({ queryKey: ['material-subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['material-tags'] });

      toast.success(`Importação concluída: ${summary.novos} novos, ${summary.updates + (fullUpdate ? summary.conflitos : 0)} atualizados`);
      return true;
    } catch (error) {
      toast.error('Erro ao aplicar importação');
      console.error(error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [canImport, canFullUpdate, duplicates, summary, preview, user?.id, queryClient]);

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
      ['codigo', 'descricao', 'unidade', 'preco_ref', 'hh_ref', 'grupo', 'categoria', 'subcategoria', 'tags'],
      ['MAT-001', 'Cabo PP 3x2.5mm²', 'm', '12.50', '0.05', 'Cabos', 'Cabos de Força', 'Baixa Tensão', 'elétrico;cobre'],
      ['MAT-002', 'Disjuntor 3P 100A', 'pç', '450.00', '0.25', 'Proteção', 'Disjuntores', '', 'proteção;industrial'],
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
