import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocuments } from '@/hooks/orcamentos/useDocuments';
import { useBudgetSummary } from '@/hooks/orcamentos/useBudgetSummary';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Trash2, Plus, Loader2, Eye, FileWarning } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { BudgetRevision } from '@/lib/orcamentos/types';

interface OutletContextType {
  budget: {
    id: string;
    budget_number: string;
    obra_nome: string;
    local?: string;
    cliente_id: string;
    cliente?: { id: string; empresa: string; codigo: string };
  };
  selectedRevision?: BudgetRevision;
  lockState: {
    isLocked: boolean;
    lockReason?: string;
    canEdit: boolean;
    canSend: boolean;
    canApprove: boolean;
    canCreateProject: boolean;
  };
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PROPOSTA: 'Proposta Comercial',
  ANEXO: 'Anexo',
  MEMORIAL: 'Memorial Descritivo',
  OUTRO: 'Outro',
};

export default function Documentos() {
  const context = useOutletContext<OutletContextType>();
  const { selectedRevision, lockState } = context || {};
  
  const { documents, isLoading, deleteDocument } = useDocuments(selectedRevision?.id);
  const { summary, isLoading: summaryLoading } = useBudgetSummary(selectedRevision?.id);
  const { toast } = useToast();
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const handleGeneratePDF = async () => {
    if (!selectedRevision?.id) return;

    setGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-budget-pdf', {
        body: { revision_id: selectedRevision.id, return_html: false },
      });

      if (error) throw error;

      if (data.html) {
        // Open HTML in new window for printing as PDF
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(data.html);
          printWindow.document.close();
          toast({
            title: 'Proposta gerada',
            description: 'Use Ctrl+P ou Cmd+P para salvar como PDF.',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Erro ao gerar proposta',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedRevision?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke('generate-budget-pdf', {
        body: { revision_id: selectedRevision.id, return_html: true },
      });

      if (error) throw error;

      setPreviewHtml(data);
    } catch (error) {
      toast({
        title: 'Erro ao visualizar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (storagePath: string, _fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('budget-documents')
        .createSignedUrl(storagePath, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      toast({
        title: 'Erro ao baixar documento',
        description: 'Não foi possível obter o link do arquivo.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      await deleteDocument.mutateAsync(documentId);
    } catch (error) {
    }
  };

  if (isLoading || summaryLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const canGenerate = !lockState?.isLocked && summary;

  return (
    <div className="space-y-6">
      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Documentos
          </CardTitle>
          <CardDescription>
            Gere propostas comerciais e outros documentos para esta revisão
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!summary ? (
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <FileWarning className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-sm">Resumo não calculado</p>
                <p className="text-sm text-muted-foreground">
                  Calcule o resumo de preços antes de gerar a proposta comercial.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handlePreview}
                variant="outline"
                disabled={!canGenerate}
              >
                <Eye className="h-4 w-4 mr-2" />
                Visualizar Proposta
              </Button>
              <Button
                onClick={handleGeneratePDF}
                disabled={!canGenerate || generatingPdf}
              >
                {generatingPdf ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Gerar Proposta Comercial
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewHtml && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Prévia da Proposta</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(null)}>
              Fechar
            </Button>
          </CardHeader>
          <CardContent>
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[600px] border rounded-lg"
              title="Prévia da Proposta"
            />
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos Gerados</CardTitle>
          <CardDescription>
            Histórico de propostas e documentos desta revisão
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum documento gerado ainda</p>
              <p className="text-sm">Gere uma proposta comercial para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Badge variant="secondary">
                        {DOCUMENT_TYPE_LABELS[doc.tipo] || doc.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {doc.nome_arquivo}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(doc.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(doc.storage_path, doc.nome_arquivo)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {!lockState?.isLocked && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(doc.id)}
                            disabled={deleteDocument.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
