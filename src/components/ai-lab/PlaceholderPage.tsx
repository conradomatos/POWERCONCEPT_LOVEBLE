import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

export function PlaceholderPage({ icon: Icon, title, subtitle }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="p-6 rounded-full bg-muted">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-muted-foreground max-w-md">{subtitle}</p>
      <Badge variant="secondary">Em desenvolvimento</Badge>
    </div>
  );
}
