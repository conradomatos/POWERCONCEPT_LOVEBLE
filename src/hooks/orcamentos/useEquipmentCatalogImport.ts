import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import * as XLSX from 'xlsx';

const COLUMN_ALIASES: Record<string, string[]> = {
  codigo: ['codigo', 'código', 'code', 'cod', 'id_equipamento', 'id'],
  descricao: ['descricao', 'descrição', 'description', 'nome', 'name', 'equipamento'],
  unidade: ['unidade', 'un', 'unit', 'und'],
  preco_mensal_ref: ['preco_mensal_ref', 'preco_mensal', 'preco', 'valor_mensal', 'valor', 'price', 'custo'],
  grupo: ['grupo', 'group', 'categoria_principal'],
  categoria: ['categoria', 'category', 'tipo'],
  subcategoria: ['subcategoria', 'subcategory', 'subtipo'],
  hierarquia_path: ['hierarquia_path', 'hierarquia', 'path', 'caminho'],
  tags: ['tags', 'etiquetas', 'labels'],
  observacao: ['observacao', 'observação', 'obs', 'notas', 'notes'],
};

export type ImportRowStatus = 'NOVO' | 'UPDATE' | 'IGUAL' | 'CONFLITO' | 'ERRO' | 'DUPLICADO';

export interface ImportPreviewRow {
  rowIndex: number;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_mensal_ref: number;
  grupo?: string;
  categoria?: string;
  subcategoria?: string;
  hierarquia_path?: string;
  tags?: string[];
  observacao?: string;
  status: ImportRowStatus;
  statusDetail?: string;
  existingId?: string;
}

export interface ImportSummary {
  total: number;
  novos: number;
  updates: number;
  iguais: number;
  erros: number;
  duplicados: number;
}

export interface ColumnMapping {
  [key: string]: string | null;
}

export function useEquipmentCatalogImport() {
  const queryClient = useQueryClient();
  const { roles } = useAuth();
  
  const canImport = roles.includes('super_admin') || roles.includes('catalog_manager');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  const detectColumnMapping = (fileHeaders: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {};
    
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      const matchedHeader = fileHeaders.find(h => 
        aliases.some(alias => 
          h.toLowerCase().trim() === alias.toLowerCase()
        )
      );
      mapping[field] = matchedHeader || null;
    }
    
    return mapping;
  };

  const parseFile = async (file: File): Promise<{ headers: string[]; data: Record<string, unknown>[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
          
          if (jsonData.length === 0) {
            reject(new Error('Arquivo vazio'));
            return;
          }
          
          const fileHeaders = Object.keys(jsonData[0]);
          resolve({ headers: fileHeaders, data: jsonData });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseTags = (value: unknown): string[] => {
    if (!value) return [];
    const str = String(value);
    return str.split(/[;,|]/).map(t => t.trim()).filter(t => t.length > 0);
  };

  const parseHierarchyPath = (value: unknown): { grupo?: string; categoria?: string; subcategoria?: string } => {
    if (!value) return {};
    const parts = String(value).split('/').map(p => p.trim()).filter(p => p.length > 0);
    return {
      grupo: parts[0] || undefined,
      categoria: parts[1] || undefined,
      subcategoria: parts[2] || undefined,
    };
  };

  const generatePreview = async (data: Record<string, unknown>[], mapping: ColumnMapping): Promise<void> => {
    setIsProcessing(true);
    
    try {
      // Fetch existing items
      const { data: existingItems, error } = await supabase
        .from('equipment_catalog')
        .select('id, codigo, descricao, unidade, preco_mensal_ref');
      
      if (error) throw error;
      
      const existingMap = new Map(existingItems?.map(item => [item.codigo, item]) || []);
      const codigoCount = new Map<string, number>();
      
      // Count duplicates in file
      data.forEach(row => {
        const codigo = String(row[mapping.codigo || ''] || '').trim();
        if (codigo) {
          codigoCount.set(codigo, (codigoCount.get(codigo) || 0) + 1);
        }
      });
      
      const duplicateCodigos = Array.from(codigoCount.entries())
        .filter(([, count]) => count > 1)
        .map(([codigo]) => codigo);
      
      setDuplicates(duplicateCodigos);
      
      const previewRows: ImportPreviewRow[] = [];
      let novos = 0, updates = 0, iguais = 0, erros = 0, duplicados = 0;
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const codigo = String(row[mapping.codigo || ''] || '').trim();
        const descricao = String(row[mapping.descricao || ''] || '').trim();
        const unidade = String(row[mapping.unidade || ''] || 'mês').trim() || 'mês';
        const precoRaw = row[mapping.preco_mensal_ref || ''];
        const preco_mensal_ref = typeof precoRaw === 'number' ? precoRaw : parseFloat(String(precoRaw).replace(',', '.')) || 0;
        
        // Get hierarchy
        let grupo = mapping.grupo ? String(row[mapping.grupo] || '').trim() : undefined;
        let categoria = mapping.categoria ? String(row[mapping.categoria] || '').trim() : undefined;
        let subcategoria = mapping.subcategoria ? String(row[mapping.subcategoria] || '').trim() : undefined;
        
        // Parse hierarchy_path if available
        if (mapping.hierarquia_path && row[mapping.hierarquia_path]) {
          const parsed = parseHierarchyPath(row[mapping.hierarquia_path]);
          grupo = grupo || parsed.grupo;
          categoria = categoria || parsed.categoria;
          subcategoria = subcategoria || parsed.subcategoria;
        }
        
        const tags = mapping.tags ? parseTags(row[mapping.tags]) : undefined;
        const observacao = mapping.observacao ? String(row[mapping.observacao] || '').trim() : undefined;
        
        // Validation
        if (!codigo) {
          previewRows.push({
            rowIndex: i + 2,
            codigo: '',
            descricao,
            unidade,
            preco_mensal_ref,
            grupo,
            categoria,
            subcategoria,
            tags,
            observacao,
            status: 'ERRO',
            statusDetail: 'Código obrigatório',
          });
          erros++;
          continue;
        }
        
        if (!descricao) {
          previewRows.push({
            rowIndex: i + 2,
            codigo,
            descricao: '',
            unidade,
            preco_mensal_ref,
            grupo,
            categoria,
            subcategoria,
            tags,
            observacao,
            status: 'ERRO',
            statusDetail: 'Descrição obrigatória',
          });
          erros++;
          continue;
        }
        
        // Check for duplicates in file
        if (duplicateCodigos.includes(codigo)) {
          previewRows.push({
            rowIndex: i + 2,
            codigo,
            descricao,
            unidade,
            preco_mensal_ref,
            grupo,
            categoria,
            subcategoria,
            tags,
            observacao,
            status: 'DUPLICADO',
            statusDetail: 'Código duplicado no arquivo',
          });
          duplicados++;
          continue;
        }
        
        // Check if exists in DB
        const existing = existingMap.get(codigo);
        
        if (existing) {
          const hasChanges = 
            existing.descricao !== descricao ||
            existing.unidade !== unidade ||
            Math.abs((existing.preco_mensal_ref || 0) - preco_mensal_ref) > 0.001;
          
          if (hasChanges) {
            previewRows.push({
              rowIndex: i + 2,
              codigo,
              descricao,
              unidade,
              preco_mensal_ref,
              grupo,
              categoria,
              subcategoria,
              tags,
              observacao,
              status: 'UPDATE',
              statusDetail: 'Dados serão atualizados',
              existingId: existing.id,
            });
            updates++;
          } else {
            previewRows.push({
              rowIndex: i + 2,
              codigo,
              descricao,
              unidade,
              preco_mensal_ref,
              grupo,
              categoria,
              subcategoria,
              tags,
              observacao,
              status: 'IGUAL',
              statusDetail: 'Sem alterações',
              existingId: existing.id,
            });
            iguais++;
          }
        } else {
          previewRows.push({
            rowIndex: i + 2,
            codigo,
            descricao,
            unidade,
            preco_mensal_ref,
            grupo,
            categoria,
            subcategoria,
            tags,
            observacao,
            status: 'NOVO',
            statusDetail: 'Será criado',
          });
          novos++;
        }
      }
      
      setPreview(previewRows);
      setSummary({
        total: data.length,
        novos,
        updates,
        iguais,
        erros,
        duplicados,
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Erro ao processar arquivo');
    } finally {
      setIsProcessing(false);
    }
  };

  const processFile = async (file: File): Promise<void> => {
    try {
      const { headers: fileHeaders, data } = await parseFile(file);
      setHeaders(fileHeaders);
      setRawData(data);
      
      const mapping = detectColumnMapping(fileHeaders);
      setColumnMapping(mapping);
      
      await generatePreview(data, mapping);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Erro ao processar arquivo');
    }
  };

  const upsertHierarchy = async (
    grupo?: string,
    categoria?: string,
    subcategoria?: string
  ): Promise<{ group_id?: string; category_id?: string; subcategory_id?: string }> => {
    const result: { group_id?: string; category_id?: string; subcategory_id?: string } = {};
    
    if (!grupo) return result;
    
    // Upsert group
    const { data: groupData } = await supabase
      .from('equipment_groups')
      .select('id')
      .eq('nome', grupo)
      .single();
    
    if (groupData) {
      result.group_id = groupData.id;
    } else {
      const { data: newGroup } = await supabase
        .from('equipment_groups')
        .insert({ nome: grupo })
        .select('id')
        .single();
      result.group_id = newGroup?.id;
    }
    
    if (!categoria || !result.group_id) return result;
    
    // Upsert category
    const { data: catData } = await supabase
      .from('equipment_categories')
      .select('id')
      .eq('nome', categoria)
      .eq('group_id', result.group_id)
      .single();
    
    if (catData) {
      result.category_id = catData.id;
    } else {
      const { data: newCat } = await supabase
        .from('equipment_categories')
        .insert({ nome: categoria, group_id: result.group_id })
        .select('id')
        .single();
      result.category_id = newCat?.id;
    }
    
    if (!subcategoria || !result.category_id) return result;
    
    // Upsert subcategory
    const { data: subData } = await supabase
      .from('equipment_subcategories')
      .select('id')
      .eq('nome', subcategoria)
      .eq('category_id', result.category_id)
      .single();
    
    if (subData) {
      result.subcategory_id = subData.id;
    } else {
      const { data: newSub } = await supabase
        .from('equipment_subcategories')
        .insert({ nome: subcategoria, category_id: result.category_id })
        .select('id')
        .single();
      result.subcategory_id = newSub?.id;
    }
    
    return result;
  };

  const upsertTags = async (tagNames: string[]): Promise<string[]> => {
    if (!tagNames || tagNames.length === 0) return [];
    
    const tagIds: string[] = [];
    
    for (const nome of tagNames) {
      const { data: existing } = await supabase
        .from('equipment_tags')
        .select('id')
        .eq('nome', nome)
        .single();
      
      if (existing) {
        tagIds.push(existing.id);
      } else {
        const { data: newTag } = await supabase
          .from('equipment_tags')
          .insert({ nome })
          .select('id')
          .single();
        if (newTag) tagIds.push(newTag.id);
      }
    }
    
    return tagIds;
  };

  const setEquipmentTags = async (equipmentId: string, tagIds: string[]): Promise<void> => {
    // Delete existing tags
    await supabase
      .from('equipment_catalog_tags')
      .delete()
      .eq('equipment_id', equipmentId);
    
    // Insert new tags
    if (tagIds.length > 0) {
      await supabase
        .from('equipment_catalog_tags')
        .insert(tagIds.map(tag_id => ({ equipment_id: equipmentId, tag_id })));
    }
  };

  const applyImport = async (fullUpdate: boolean, filename?: string): Promise<void> => {
    if (!preview.length) return;
    
    setIsProcessing(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      let createdCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      
      for (const row of preview) {
        if (row.status === 'ERRO' || row.status === 'DUPLICADO') {
          errorCount++;
          continue;
        }
        
        if (row.status === 'IGUAL' && !fullUpdate) continue;
        
        try {
          // Upsert hierarchy
          const hierarchy = await upsertHierarchy(row.grupo, row.categoria, row.subcategoria);
          
          // Upsert tags
          const tagIds = row.tags ? await upsertTags(row.tags) : [];
          
          if (row.status === 'NOVO') {
            const { data: newItem, error } = await supabase
              .from('equipment_catalog')
              .insert({
                codigo: row.codigo,
                descricao: row.descricao,
                unidade: row.unidade,
                preco_mensal_ref: row.preco_mensal_ref,
                group_id: hierarchy.group_id,
                category_id: hierarchy.category_id,
                subcategory_id: hierarchy.subcategory_id,
                observacao: row.observacao,
                created_by: userId,
                updated_by: userId,
              })
              .select('id')
              .single();
            
            if (error) throw error;
            
            if (newItem && tagIds.length > 0) {
              await setEquipmentTags(newItem.id, tagIds);
            }
            
            createdCount++;
          } else if (row.status === 'UPDATE' || (row.status === 'IGUAL' && fullUpdate)) {
            if (!row.existingId) continue;
            
            const { error } = await supabase
              .from('equipment_catalog')
              .update({
                descricao: row.descricao,
                unidade: row.unidade,
                preco_mensal_ref: row.preco_mensal_ref,
                group_id: hierarchy.group_id,
                category_id: hierarchy.category_id,
                subcategory_id: hierarchy.subcategory_id,
                observacao: row.observacao,
                updated_by: userId,
              })
              .eq('id', row.existingId);
            
            if (error) throw error;
            
            if (tagIds.length > 0) {
              await setEquipmentTags(row.existingId, tagIds);
            }
            
            updatedCount++;
          }
        } catch (rowError) {
          console.error('Error processing row:', row.codigo, rowError);
          errorCount++;
        }
      }
      
      // Log import run
      await supabase
        .from('equipment_import_runs')
        .insert({
          filename,
          total_rows: preview.length,
          created_count: createdCount,
          updated_count: updatedCount,
          error_count: errorCount,
          imported_by: userId,
        });
      
      queryClient.invalidateQueries({ queryKey: ['equipment-catalog-new'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-groups'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-categories'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-tags'] });
      
      toast.success(`Importação concluída: ${createdCount} novos, ${updatedCount} atualizados, ${errorCount} erros`);
    } catch (error) {
      console.error('Error applying import:', error);
      toast.error('Erro ao aplicar importação');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = (): void => {
    setPreview([]);
    setSummary(null);
    setDuplicates([]);
    setColumnMapping({});
    setRawData([]);
    setHeaders([]);
  };

  const updateMapping = async (newMapping: ColumnMapping): Promise<void> => {
    setColumnMapping(newMapping);
    if (rawData.length > 0) {
      await generatePreview(rawData, newMapping);
    }
  };

  const downloadTemplate = (): void => {
    const templateData = [
      {
        codigo: 'EQ-001',
        descricao: 'Gerador 100 kVA',
        unidade: 'mês',
        preco_mensal_ref: 5000,
        hierarquia_path: 'Geradores / 100 kVA',
        tags: 'gerador;energia;locacao',
        observacao: 'Incluir operador',
      },
      {
        codigo: 'EQ-002',
        descricao: 'Andaime tubular 1,5m',
        unidade: 'mês',
        preco_mensal_ref: 150,
        hierarquia_path: 'Andaimes / Tubular',
        tags: 'andaime;altura',
        observacao: '',
      },
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipamentos');
    XLSX.writeFile(workbook, 'template_equipamentos.xlsx');
  };

  return {
    isProcessing,
    preview,
    summary,
    duplicates,
    columnMapping,
    headers,
    canImport,
    processFile,
    applyImport,
    reset,
    updateMapping,
    downloadTemplate,
  };
}
