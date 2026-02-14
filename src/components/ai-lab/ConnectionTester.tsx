import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface ConnectionTesterProps {
  onTest: (url: string) => Promise<{ success: boolean; latency?: number; error?: string }>;
  url: string;
}

export function ConnectionTester({ onTest, url }: ConnectionTesterProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; latency?: number; error?: string } | null>(null);

  const handleTest = async () => {
    if (!url) return;
    setTesting(true);
    setResult(null);
    const res = await onTest(url);
    setResult(res);
    setTesting(false);
  };

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={handleTest} disabled={testing || !url}>
        {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
        {testing ? 'Testando...' : 'Testar Conexão'}
      </Button>
      {result && (
        <div className={`flex items-center gap-2 text-sm ${result.success ? 'text-green-500' : 'text-destructive'}`}>
          {result.success ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {result.success ? `Conectado com sucesso (${result.latency}ms)` : `Falha: ${result.error}`}
        </div>
      )}
    </div>
  );
}
