import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from './StatusBadge';
import type { BudgetRevision, RevisionStatus } from '@/lib/orcamentos/types';

interface RevisionSelectorProps {
  revisions: BudgetRevision[];
  selectedRevisionId: string | undefined;
  onSelect: (revisionId: string) => void;
  disabled?: boolean;
}

export function RevisionSelector({
  revisions,
  selectedRevisionId,
  onSelect,
  disabled,
}: RevisionSelectorProps) {
  const selectedRevision = revisions.find((r) => r.id === selectedRevisionId);

  return (
    <Select
      value={selectedRevisionId}
      onValueChange={onSelect}
      disabled={disabled || revisions.length === 0}
    >
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Selecione uma revisão">
          {selectedRevision && (
            <div className="flex items-center gap-2">
              <span>Rev. {selectedRevision.revision_number}</span>
              <StatusBadge status={selectedRevision.status as RevisionStatus} size="sm" showIcon={false} />
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {revisions.map((revision) => (
          <SelectItem key={revision.id} value={revision.id}>
            <div className="flex items-center gap-2">
              <span>Rev. {revision.revision_number}</span>
              <StatusBadge status={revision.status as RevisionStatus} size="sm" showIcon={false} />
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
