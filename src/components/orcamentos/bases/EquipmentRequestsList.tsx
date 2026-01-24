import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useEquipmentCatalogRequests, 
  type EquipmentCatalogRequest 
} from '@/hooks/orcamentos/useEquipmentCatalogRequests';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Check, 
  X, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  MessageSquare 
} from 'lucide-react';

interface EquipmentRequestsListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EquipmentRequestsList({ open, onOpenChange }: EquipmentRequestsListProps) {
  const { requests, isLoading, isCatalogManager, approveRequest, rejectRequest } = useEquipmentCatalogRequests();
  
  const [reviewRequest, setReviewRequest] = useState<EquipmentCatalogRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const getStatusBadge = (status: EquipmentCatalogRequest['status']) => {
    switch (status) {
      case 'PENDENTE':
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'APROVADO':
        return <Badge variant="secondary" className="bg-secondary/80"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'REJEITADO':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleReview = async () => {
    if (!reviewRequest || !reviewAction) return;

    if (reviewAction === 'approve') {
      await approveRequest.mutateAsync({ requestId: reviewRequest.id, notes: reviewNotes });
    } else {
      await rejectRequest.mutateAsync({ requestId: reviewRequest.id, notes: reviewNotes });
    }

    setReviewRequest(null);
    setReviewAction(null);
    setReviewNotes('');
  };

  const pendingRequests = requests.filter(r => r.status === 'PENDENTE');
  const reviewedRequests = requests.filter(r => r.status !== 'PENDENTE');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {isCatalogManager ? 'Solicitações de Inclusão' : 'Minhas Solicitações'}
            </DialogTitle>
            <DialogDescription>
              {isCatalogManager 
                ? 'Gerencie as solicitações de inclusão de equipamentos no catálogo.'
                : 'Acompanhe o status das suas solicitações de inclusão.'}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma solicitação encontrada.
            </div>
          ) : (
            <ScrollArea className="h-[50vh]">
              {pendingRequests.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                    Pendentes ({pendingRequests.length})
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead className="text-right">Preço Ref.</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        {isCatalogManager && <TableHead className="text-right">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map(request => (
                        <TableRow key={request.id}>
                          <TableCell className="font-mono text-sm">
                            {request.codigo || '-'}
                          </TableCell>
                          <TableCell>
                            <div>
                              {request.descricao}
                              {request.observacao && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {request.observacao}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{request.unidade}</TableCell>
                          <TableCell className="text-right">
                            {request.preco_mensal_ref 
                              ? formatCurrency(request.preco_mensal_ref)
                              : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(request.requested_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          {isCatalogManager && (
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-primary hover:text-primary hover:bg-primary/10"
                                  onClick={() => {
                                    setReviewRequest(request);
                                    setReviewAction('approve');
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setReviewRequest(request);
                                    setReviewAction('reject');
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {reviewedRequests.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                    Histórico ({reviewedRequests.length})
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Observação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviewedRequests.map(request => (
                        <TableRow key={request.id}>
                          <TableCell className="font-mono text-sm">
                            {request.codigo || '-'}
                          </TableCell>
                          <TableCell>{request.descricao}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(request.requested_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {request.review_notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <AlertDialog 
        open={!!reviewRequest && !!reviewAction} 
        onOpenChange={(open) => {
          if (!open) {
            setReviewRequest(null);
            setReviewAction(null);
            setReviewNotes('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reviewAction === 'approve' ? 'Aprovar Solicitação' : 'Rejeitar Solicitação'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {reviewAction === 'approve' 
                ? 'O equipamento será adicionado ao catálogo global.'
                : 'A solicitação será marcada como rejeitada.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {reviewRequest && (
            <div className="py-4 space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">{reviewRequest.descricao}</p>
                {reviewRequest.codigo && (
                  <p className="text-sm text-muted-foreground">Código: {reviewRequest.codigo}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Observação (opcional)
                </label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={reviewAction === 'approve' 
                    ? 'Ex: Código ajustado para seguir padrão...'
                    : 'Ex: Equipamento já existe com outro nome...'}
                  rows={2}
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReview}
              className={reviewAction === 'approve' ? '' : 'bg-destructive hover:bg-destructive/90'}
            >
              {approveRequest.isPending || rejectRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : reviewAction === 'approve' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Aprovar
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Rejeitar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
