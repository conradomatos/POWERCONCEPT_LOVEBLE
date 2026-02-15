import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAISettings } from '@/hooks/ai-lab/useAISettings';
import { useAIAgents } from '@/hooks/ai-lab/useAIAgents';
import { ConnectionTester } from '@/components/ai-lab/ConnectionTester';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Wifi, WifiOff, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function AILabSettings() {
  const { settings, loading, saveSettings, testConnection } = useAISettings();
  const { agents } = useAIAgents();
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [defaultAgent, setDefaultAgent] = useState('default');
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (settings) {
      setApiUrl(settings.api_url || '');
      setApiKey(settings.api_key || '');
      setDefaultAgent(settings.default_agent || 'default');
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await saveSettings({ api_url: apiUrl || null, api_key: apiKey || null, default_agent: defaultAgent }) || {};
    if (!error) toast({ title: 'Configurações salvas' });
    else toast({ title: 'Erro ao salvar', variant: 'destructive' });
    setSaving(false);
  };

  if (loading) return <Layout><p className="text-muted-foreground text-center py-10">Carregando...</p></Layout>;

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Configure a conexão com o backend de IA</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Conexão com API
              {settings?.is_connected ? (
                <Badge className="bg-green-500/15 text-green-500 border-green-500/30"><Wifi className="h-3 w-3 mr-1" /> Conectado</Badge>
              ) : (
                <Badge variant="outline"><WifiOff className="h-3 w-3 mr-1" /> Desconectado</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL da API</Label>
              <Input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="https://seu-servidor.com:8000" />
            </div>
            <div>
              <Label>Chave de API (opcional)</Label>
              <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." />
            </div>
            <div>
              <Label>Agente Padrão</Label>
              <Select value={defaultAgent} onValueChange={setDefaultAgent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {agents.filter(a => a.is_active).map(a => (
                    <SelectItem key={a.slug} value={a.slug}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <ConnectionTester url={apiUrl} onTest={testConnection} />
            </div>

            {settings?.last_connection_test && (
              <p className="text-xs text-muted-foreground">
                Último teste: {new Date(settings.last_connection_test).toLocaleString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
