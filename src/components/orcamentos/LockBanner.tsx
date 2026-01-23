import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LockBannerProps {
  message: string;
  onCreateNewRevision?: () => void;
  showCreateButton?: boolean;
}

export function LockBanner({ message, onCreateNewRevision, showCreateButton = true }: LockBannerProps) {
  return (
    <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
      <Lock className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-amber-700 dark:text-amber-400">{message}</span>
        {showCreateButton && onCreateNewRevision && (
          <Button size="sm" variant="outline" onClick={onCreateNewRevision}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Revisão
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
