import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useAIAgents, type AIAgent } from '@/hooks/ai-lab/useAIAgents';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AGENT_ICON_OPTIONS, AGENT_ICONS } from '@/lib/agent-icons';
import { ArrowLeft, Bot, Save, Send, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function AgentEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { agents, loading: agentsLoading, createAgent, updateAgent } = useAIAgents();
  const isNew = !id;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('bot');
  const [color, setColor] = useState('#F59E0B');
  const [isActive, setIsActive] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Preview state
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [testing, setTesting] = useState(false);

  // Load existing agent
  useEffect(() => {
    if (!isNew && agents.length > 0 && !initialized) {
      const agent = agents.find(a => a.id === id);
      if (agent) {
        setName(agent.name);
        setSlug(agent.slug);
        setDescription(agent.description || '');
        setIcon(agent.icon || 'bot');
        setColor(agent.color || '#F59E0B');
        setIsActive(agent.is_active);
        setSystemPrompt(agent.system_prompt || '');
        setTemperature(agent.temperature ?? 0.3);
        setMaxTokens(agent.max_tokens ?? 2000);
        setInitialized(true);
      }
    }
  }, [agents, id, isNew, initialized]);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (isNew || !initialized) {
      const generated = value
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generated);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      toast({ title: 'Nome e slug são obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const data = {
        name,
        slug,
        description,
        icon,
        color,
        is_active: isActive,
        system_prompt: systemPrompt,
        temperature,
        max_tokens: maxTokens,
      };
      if (isNew) {
        await createAgent(data);
        toast({ title: 'Agente criado com sucesso' });
      } else {
        await updateAgent(id!, data);
        toast({ title: 'Agente atualizado com sucesso' });
      }
      navigate('/ai-lab/agents');
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testMessage.trim() || !user) return;
    setTesting(true);
    setTestResponse('');
    try {
      const { data: settings } = await supabase
        .from('ai_settings')
        .select('api_url, api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!settings?.api_url) {
        setTestResponse('Configure a URL da API em Configurações do AI Lab.');
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };
      if (settings.api_key) headers['Authorization'] = `Bearer ${settings.api_key}`;

      const response = await fetch(`${settings.api_url}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: testMessage,
          thread_id: `test_${Date.now()}`,
          user_id: user.id,
          agent_type: slug || 'test',
          system_prompt: systemPrompt,
          temperature,
          history: [],
        }),
        signal: AbortSignal.timeout(120000),
      });

      const result = await response.json();
      setTestResponse(result.response || result.message || 'Sem resposta.');
    } catch (err: any) {
      setTestResponse(`Erro: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const SelectedIcon = AGENT_ICONS[icon] || Bot;
  const existingAgent = !isNew ? agents.find(a => a.id === id) : null;

  if (!isNew && agentsLoading) {
    return (
      <Layout>
        <p className="text-center text-muted-foreground py-10">Carregando...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto pb-24">
        {/* Breadcrumb & Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ai-lab/agents')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/ai-lab')}>AI Lab</span>
            <span>/</span>
            <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/ai-lab/agents')}>Agentes</span>
            <span>/</span>
            <span className="text-foreground">{existingAgent?.name || 'Novo Agente'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{isNew ? 'Novo Agente' : `Editar: ${existingAgent?.name}`}</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/ai-lab/agents')}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim() || !slug.trim()}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </div>

        {/* Section 1: Identity */}
        <Card>
          <CardHeader><CardTitle>Identidade</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome *</Label>
                <Input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Ex: Engenheiro de Custos" />
              </div>
              <div>
                <Label>Slug / Identificador *</Label>
                <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="ex: engenheiro-custos" />
                <p className="text-xs text-muted-foreground mt-1">Gerado automaticamente a partir do nome</p>
              </div>
            </div>

            <div>
              <Label>Descrição curta</Label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 200))}
                placeholder="Breve descrição exibida nos cards e chips"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">{description.length}/200 caracteres</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Ícone</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger>
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        <SelectedIcon className="h-4 w-4" />
                        {AGENT_ICON_OPTIONS.find(o => o.value === icon)?.label}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_ICON_OPTIONS.map(opt => {
                      const OptIcon = AGENT_ICONS[opt.value] || Bot;
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2"><OptIcon className="h-4 w-4" />{opt.label}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cor</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                  <Input value={color} onChange={e => setColor(e.target.value)} className="flex-1" placeholder="#F59E0B" />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Ativo' : 'Inativo'}</Badge>
                </div>
              </div>
            </div>

            {/* Preview card */}
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Preview do card</p>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: color + '20', color }}>
                  <SelectedIcon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{name || 'Nome do Agente'}</span>
                    <Badge variant="outline">{slug || 'slug'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{description || 'Sem descrição'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Personality */}
        <Card>
          <CardHeader>
            <CardTitle>Personalidade e Comportamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label className="text-sm font-medium">
              Instrução Principal — Define quem o agente é, como se comporta, e o que ele sabe
            </Label>
            <Textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={12}
              placeholder="Voce e um especialista em..."
              className="font-mono text-sm"
            />
            <div className="flex justify-between">
              <p className="text-xs text-muted-foreground">
                Dica: Seja específico. Defina a personalidade, o tom, as especialidades e as regras de comportamento. Quanto mais detalhado, melhor o agente performa.
              </p>
              <span className="text-xs text-muted-foreground">{systemPrompt.length} caracteres</span>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Technical Parameters */}
        <Card>
          <CardHeader><CardTitle>Parâmetros Técnicos</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Criatividade (Temperatura)</Label>
                <Badge variant="outline">{temperature.toFixed(1)}</Badge>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={([v]) => setTemperature(v)}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                0.0 = Respostas precisas e consistentes | 1.0 = Respostas criativas e variadas
              </p>
            </div>

            <div>
              <Label>Tamanho máximo da resposta (tokens)</Label>
              <Input
                type="number"
                value={maxTokens}
                onChange={e => setMaxTokens(Math.min(4000, Math.max(100, Number(e.target.value))))}
                min={100}
                max={4000}
                className="mt-1 w-48"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Mínimo: 100 | Máximo: 4000 | Padrão: 2000
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Preview */}
        <Card>
          <CardHeader><CardTitle>Preview — Testar Agente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Pergunta de teste</Label>
              <Textarea
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                rows={3}
                placeholder="Digite uma pergunta para testar o comportamento do agente..."
              />
            </div>
            <Button onClick={handleTest} disabled={testing || !testMessage.trim()}>
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Testar Agente
            </Button>
            {testResponse && (
              <div className="border border-border rounded-lg p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">Resposta do agente:</p>
                <p className="text-sm whitespace-pre-wrap">{testResponse}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Save Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 flex justify-end gap-3 z-50">
          <Button variant="outline" onClick={() => navigate('/ai-lab/agents')}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || !slug.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </div>
    </Layout>
  );
}
