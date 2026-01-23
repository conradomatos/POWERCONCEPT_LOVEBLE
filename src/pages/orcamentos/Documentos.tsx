import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDocuments } from '@/hooks/orcamentos/useDocuments';
import { FileText, Download, Trash2, Plus, FileWarning } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { BudgetRevision } from '@/lib/orcamentos/types';

interface OutletContextType {
  budget: any;
  selectedRevision: BudgetRevision | undefined;
  lockState: { isLocked: boolean };
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PROPOSTA: 'Proposta Comercial',
  ANEXO: 'Anexo',
  MEMORIA: 'Memória de Cálculo',
};

export default function Documentos() {
  const context = useOutletContext<OutletContextType>();
  const { selectedRevision, lockState } = context || {};
  
  const { documents, isLoading, deleteDocument } = useDocuments(selectedRevision?.id);

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este documento?')) {
      await deleteDocument.mutateAsync(id);
    }
  };

  const handleGeneratePDF = () => {
    // TODO: Implement PDF generation via Edge Function
    alert('Funcionalidade de geração de PDF em desenvolvimento');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos
          </CardTitle>
          <CardDescription>
            Propostas comerciais e anexos gerados
          </CardDescription>
        </div>
        {!lockState?.isLocked && (
          <Button onClick={handleGeneratePDF}>
            <Plus className="h-4 w-4 mr-2" />
            Gerar Proposta
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <FileWarning className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum documento gerado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Clique em "Gerar Proposta" para criar uma proposta comercial em PDF
            </p>
            {!lockState?.isLocked && (
              <Button variant="outline" onClick={handleGeneratePDF}>
                <Plus className="h-4 w-4 mr-2" />
                Gerar Proposta
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nome do Arquivo</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs bg-muted">
                      {DOCUMENT_TYPE_LABELS[doc.tipo] || doc.tipo}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{doc.nome_arquivo}</TableCell>
                  <TableCell>
                    {format(parseISO(doc.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Download">
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
  );
}
