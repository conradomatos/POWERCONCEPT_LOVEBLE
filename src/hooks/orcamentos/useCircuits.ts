import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface Circuit {
  id: string;
  revision_id: string;
  wbs_id: string | null;
  tag: string;
  tipo_partida: string | null;
  kw: number | null;
  tensao_v: number | null;
  corrente_in_a: number | null;
  fatores_json: Json;
  saida_json: Json;
  created_at: string;
}

export interface GeneratedMaterial {
  id: string;
  revision_id: string;
  circuit_id: string;
  material_codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  status: 'PENDENTE' | 'APLICADO';
  created_at: string;
}

export interface CircuitFormData {
  tag: string;
  tipo_partida?: string | null;
  kw?: number | null;
  tensao_v?: number | null;
  corrente_in_a?: number | null;
  wbs_id?: string | null;
  fatores_json?: Json;
  saida_json?: Json;
}

export function useCircuits(revisionId: string | undefined) {
  const queryClient = useQueryClient();

  // List circuits by revision
  const { data: circuits = [], isLoading: circuitsLoading } = useQuery({
    queryKey: ['budget-circuits', revisionId],
    queryFn: async () => {
      if (!revisionId) return [];
      const { data, error } = await supabase
        .from('budget_circuits')
        .select('*')
        .eq('revision_id', revisionId)
        .order('tag', { ascending: true });

      if (error) throw error;
      return data as Circuit[];
    },
    enabled: !!revisionId,
  });

  // List generated materials by revision
  const { data: generatedMaterials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ['budget-generated-materials', revisionId],
    queryFn: async () => {
      if (!revisionId) return [];
      const { data, error } = await supabase
        .from('budget_generated_materials')
        .select('*')
        .eq('revision_id', revisionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as GeneratedMaterial[];
    },
    enabled: !!revisionId,
  });

  // Create circuit
  const createCircuit = useMutation({
    mutationFn: async (formData: CircuitFormData) => {
      if (!revisionId) throw new Error('Revision ID required');
      
      const { data, error } = await supabase
        .from('budget_circuits')
        .insert({
          revision_id: revisionId,
          tag: formData.tag,
          tipo_partida: formData.tipo_partida ?? null,
          kw: formData.kw ?? null,
          tensao_v: formData.tensao_v ?? null,
          corrente_in_a: formData.corrente_in_a ?? null,
          wbs_id: formData.wbs_id ?? null,
          fatores_json: formData.fatores_json ?? {},
          saida_json: formData.saida_json ?? {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-circuits', revisionId] });
      toast.success('Circuito criado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar circuito: ${error.message}`);
    },
  });

  // Update circuit
  const updateCircuit = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; tag?: string; tipo_partida?: string | null; kw?: number | null; tensao_v?: number | null; corrente_in_a?: number | null; wbs_id?: string | null }) => {
      const { data, error } = await supabase
        .from('budget_circuits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-circuits', revisionId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar circuito: ${error.message}`);
    },
  });

  // Delete circuit
  const deleteCircuit = useMutation({
    mutationFn: async (id: string) => {
      // First delete generated materials for this circuit
      await supabase
        .from('budget_generated_materials')
        .delete()
        .eq('circuit_id', id);

      const { error } = await supabase
        .from('budget_circuits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-circuits', revisionId] });
      queryClient.invalidateQueries({ queryKey: ['budget-generated-materials', revisionId] });
      toast.success('Circuito excluído');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir circuito: ${error.message}`);
    },
  });

  // Generate materials for circuit (MVP: creates 3 sample lines)
  const generateMaterials = useMutation({
    mutationFn: async (circuitId: string) => {
      if (!revisionId) throw new Error('Revision ID required');
      
      const circuit = circuits.find(c => c.id === circuitId);
      if (!circuit) throw new Error('Circuito não encontrado');

      // Delete existing PENDENTE materials for this circuit
      await supabase
        .from('budget_generated_materials')
        .delete()
        .eq('circuit_id', circuitId)
        .eq('status', 'PENDENTE');

      // MVP: Generate 3 sample materials based on circuit data
      const sampleMaterials = [
        {
          revision_id: revisionId,
          circuit_id: circuitId,
          material_codigo: `DISJUNTOR-${circuit.tag}`,
          descricao: `Disjuntor para circuito ${circuit.tag} - ${circuit.kw || 0}kW`,
          unidade: 'pç',
          quantidade: 1,
          status: 'PENDENTE' as const,
        },
        {
          revision_id: revisionId,
          circuit_id: circuitId,
          material_codigo: `CABO-${circuit.tag}`,
          descricao: `Cabo para circuito ${circuit.tag} - ${circuit.tensao_v || 0}V`,
          unidade: 'm',
          quantidade: circuit.kw ? circuit.kw * 10 : 50,
          status: 'PENDENTE' as const,
        },
        {
          revision_id: revisionId,
          circuit_id: circuitId,
          material_codigo: `CONECTOR-${circuit.tag}`,
          descricao: `Conectores para circuito ${circuit.tag}`,
          unidade: 'pç',
          quantidade: 4,
          status: 'PENDENTE' as const,
        },
      ];

      const { data, error } = await supabase
        .from('budget_generated_materials')
        .insert(sampleMaterials)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-generated-materials', revisionId] });
      toast.success('Materiais gerados com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao gerar materiais: ${error.message}`);
    },
  });

  // Apply generated materials to levantamento (budget_material_items)
  const applyToLevantamento = useMutation({
    mutationFn: async (generatedIds: string[]) => {
      if (!revisionId) throw new Error('Revision ID required');
      if (generatedIds.length === 0) throw new Error('Nenhum material selecionado');

      // Get generated materials
      const { data: generated, error: fetchError } = await supabase
        .from('budget_generated_materials')
        .select('*')
        .in('id', generatedIds)
        .eq('status', 'PENDENTE');

      if (fetchError) throw fetchError;
      if (!generated || generated.length === 0) {
        throw new Error('Nenhum material pendente encontrado');
      }

      // Get next item_seq
      const { data: lastItem } = await supabase
        .from('budget_material_items')
        .select('item_seq')
        .eq('revision_id', revisionId)
        .order('item_seq', { ascending: false })
        .limit(1)
        .single();

      let nextSeq = (lastItem?.item_seq ?? 0) + 1;

      // Insert into budget_material_items
      const materialItems = generated.map((g) => ({
        revision_id: revisionId,
        item_seq: nextSeq++,
        codigo: g.material_codigo,
        descricao: g.descricao,
        unidade: g.unidade,
        quantidade: g.quantidade,
        fornecimento: 'CONCEPT' as const,
        hh_unitario: 0,
        fator_dificuldade: 1,
        hh_total: 0,
        preco_unit: 0,
        preco_total: 0,
      }));

      const { error: insertError } = await supabase
        .from('budget_material_items')
        .insert(materialItems);

      if (insertError) throw insertError;

      // Mark generated materials as APLICADO
      const { error: updateError } = await supabase
        .from('budget_generated_materials')
        .update({ status: 'APLICADO' })
        .in('id', generatedIds);

      if (updateError) throw updateError;

      return materialItems.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['budget-generated-materials', revisionId] });
      queryClient.invalidateQueries({ queryKey: ['budget-materials', revisionId] });
      toast.success(`${count} materiais aplicados no levantamento`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao aplicar materiais: ${error.message}`);
    },
  });

  // Delete generated material
  const deleteGenerated = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_generated_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-generated-materials', revisionId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir material: ${error.message}`);
    },
  });

  return {
    circuits,
    generatedMaterials,
    isLoading: circuitsLoading || materialsLoading,
    createCircuit,
    updateCircuit,
    deleteCircuit,
    generateMaterials,
    applyToLevantamento,
    deleteGenerated,
  };
}
