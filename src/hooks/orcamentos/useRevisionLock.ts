import { useMemo } from 'react';
import type { BudgetRevision, RevisionStatus } from '@/lib/orcamentos/types';

interface RevisionLockState {
  isLocked: boolean;
  canEdit: boolean;
  canSend: boolean;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  canCreateNewRevision: boolean;
  canCreateProject: boolean;
  lockReason?: string;
}

export function useRevisionLock(revision: BudgetRevision | null): RevisionLockState {
  return useMemo(() => {
    if (!revision) {
      return {
        isLocked: true,
        canEdit: false,
        canSend: false,
        canApprove: false,
        canReject: false,
        canCancel: false,
        canCreateNewRevision: false,
        canCreateProject: false,
        lockReason: 'Nenhuma revisão selecionada',
      };
    }

    const status = revision.status as RevisionStatus;
    const isLocked = status !== 'DRAFT';

    const lockReasons: Record<RevisionStatus, string> = {
      DRAFT: '',
      SENT: 'Revisão enviada para aprovação. Crie uma nova revisão para editar.',
      APPROVED: 'Revisão aprovada. Crie uma nova revisão para editar.',
      REJECTED: 'Revisão reprovada. Crie uma nova revisão para editar.',
      CANCELED: 'Revisão cancelada. Crie uma nova revisão para editar.',
    };

    return {
      isLocked,
      canEdit: status === 'DRAFT',
      canSend: status === 'DRAFT',
      canApprove: status === 'SENT',
      canReject: status === 'SENT',
      canCancel: status === 'DRAFT' || status === 'SENT',
      canCreateNewRevision: true, // Sempre pode criar nova revisão
      canCreateProject: status === 'APPROVED' && !revision.projeto_id,
      lockReason: lockReasons[status] || '',
    };
  }, [revision]);
}
