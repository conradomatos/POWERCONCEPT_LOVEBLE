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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AGENT_ICON_OPTIONS, AGENT_ICONS } from '@/lib/agent-icons';
import { ArrowLeft, Bot, Save, Send, Loader2, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const TAG_SUGGESTIONS = ['Técnico', 'Financeiro', 'Jurídico', 'Comercial', 'Segurança', 'Gestão', 'Planejamento'];

export default function AgentEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { agents, loading: agentsLoading, createAgent, updateAgent } = useAIAgents();
  const isNew = !id;

  // Identity
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('bot');
  const [color, setColor] = useState('#F59E0B');
  const [isActive, setIsActive] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Personality
  const [systemPrompt, setSystemPrompt] = useState('');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [exampleResponses, setExampleResponses] = useState('');

  // Technical
  const [model, setModel] = useState('gpt-4o');
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [maxResponseLength, setMaxResponseLength] = useState('medium');
  const [debatePosture, setDebatePosture] = useState('critical');

  // Access
  const [minAccessLevel, setMinAccessLevel] = useState('operational');
  const [priorityOrder, setPriorityOrder] = useState(0);

  // State
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [testing, setTesting] = useState(false);

  const existingAgent = !isNew ? agents.find(a => a.id === id) : null;

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
        setTags(agent.tags || []);
        setSystemPrompt(agent.system_prompt || '');
        setKnowledgeBase(agent.knowledge_base || '');
        setExampleResponses(agent.example_responses || '');
        setModel(agent.model || 'gpt-4o');
        setTemperature(agent.temperature ?? 0.3);
        setMaxTokens(agent.max_tokens ?? 2000);
        setMaxResponseLength(agent.max_response_length || 'medium');
        setDebatePosture(agent.debate_posture || 'critical');
        setPriorityOrder(agent.priority_order ?? 0);
        setInitialized(true);
      }
    }
  }, [agents, id, isNew, initialized]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (isNew || !initialized) {
      setSlug(value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  };

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      toast({ title: 'Nome e slug são obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const data: Partial<AIAgent> = {
        name, slug, description, icon, color, is_active: isActive,
        tags: tags.length > 0 ? tags : null,
        system_prompt: systemPrompt,
        knowledge_base: knowledgeBase || null,
        example_responses: exampleResponses || null,
        model, temperature, max_tokens: maxTokens,
        max_response_length: maxResponseLength,
        debate_posture: debatePosture,
        priority_order: priorityOrder,
      };
      if (isNew) {
        await createAgent(data as any);
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
      };
      if (settings.api_key) headers['Authorization'] = `Bearer ${settings.api_key}`;

      const body: Record<string, unknown> = {
        message: testMessage,
        thread_id: `test_${Date.now()}`,
        user_id: user.id,
        agent_type: slug || 'test',
        system_prompt: systemPrompt,
        temperature,
        model,
        history: [],
      };
      if (knowledgeBase) body.knowledge_base = knowledgeBase;
      if (exampleResponses) body.example_responses = exampleResponses;

      const response = await fetch(`${settings.api_url}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
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

  if (!isNew && agentsLoading) {
    return <Layout><p className="text-center text-muted-foreground py-10">Carregando...</p></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto pb-24">
        {/* Breadcrumb */}
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
        </div>

        <Tabs defaultValue="identity" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
            <TabsTrigger value="identity">Identidade</TabsTrigger>
            <TabsTrigger value="personality">Personalidade</TabsTrigger>
            <TabsTrigger value="technical">Parâmetros Técnicos</TabsTrigger>
            <TabsTrigger value="access">Acesso</TabsTrigger>
            <TabsTrigger value="preview">Preview e Teste</TabsTrigger>
          </TabsList>

          {/* TAB 1: Identity */}
          <TabsContent value="identity" className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Ex: Engenheiro de Custos" />
                  </div>
                  <div>
                    <Label>Slug *</Label>
                    <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="engenheiro-custos" />
                    <p className="text-xs text-muted-foreground mt-1">Gerado automaticamente do nome</p>
                  </div>
                </div>

                <div>
                  <Label>Descrição curta</Label>
                  <Input value={description} onChange={e => setDescription(e.target.value.slice(0, 200))} placeholder="Breve descrição" maxLength={200} />
                  <p className="text-xs text-muted-foreground mt-1">{description.length}/200</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Ícone</Label>
                    <Select value={icon} onValueChange={setIcon}>
                      <SelectTrigger>
                        <SelectValue>
                          <span className="flex items-center gap-2"><SelectedIcon className="h-4 w-4" />{AGENT_ICON_OPTIONS.find(o => o.value === icon)?.label}</span>
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
                      <Input value={color} onChange={e => setColor(e.target.value)} className="flex-1" />
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

                {/* Tags */}
                <div>
                  <Label>Tags</Label>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setTags(prev => prev.filter(t => t !== tag))} />
                      </Badge>
                    ))}
                    <Input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                      placeholder="Adicionar tag..."
                      className="w-40"
                    />
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {TAG_SUGGESTIONS.filter(s => !tags.includes(s)).map(s => (
                      <Badge key={s} variant="outline" className="cursor-pointer text-xs" onClick={() => addTag(s)}>{s}</Badge>
                    ))}
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
          </TabsContent>

          {/* TAB 2: Personality */}
          <TabsContent value="personality" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base">🧠 Instrução Principal (System Prompt)</CardTitle>
                  <p className="text-xs text-muted-foreground">Defina a identidade, personalidade, tom, regras e especialidades. Seja extremamente específico.</p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={systemPrompt}
                    onChange={e => setSystemPrompt(e.target.value)}
                    rows={15}
                    placeholder="Voce e um especialista em..."
                    className="font-mono text-sm"
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-muted-foreground">Dicas: 1) Dê um nome e história. 2) Defina REGRAS ABSOLUTAS. 3) Diga como NÃO se comportar. 4) Use exemplos de frases.</p>
                    <span className="text-xs text-muted-foreground">{systemPrompt.length} chars</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">📚 Base de Conhecimento</CardTitle>
                  <p className="text-xs text-muted-foreground">Dados fixos: tabelas, normas, fórmulas, limites legais.</p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={knowledgeBase}
                    onChange={e => setKnowledgeBase(e.target.value)}
                    rows={10}
                    placeholder="Tabela BDI referencial TCU, limites de aditivos..."
                    className="font-mono text-sm"
                  />
                  <span className="text-xs text-muted-foreground">{knowledgeBase.length} chars</span>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">💬 Exemplos de Resposta (Few-Shot)</CardTitle>
                <p className="text-xs text-muted-foreground">Mostre 2-3 exemplos de como o agente DEVE responder. Formato: PERGUNTA: ... RESPOSTA: ...</p>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={exampleResponses}
                  onChange={e => setExampleResponses(e.target.value)}
                  rows={8}
                  placeholder={"PERGUNTA: Qual BDI usar?\nRESPOSTA: Antes de responder, preciso saber: obra pública ou privada?..."}
                  className="font-mono text-sm"
                />
                <span className="text-xs text-muted-foreground">{exampleResponses.length} chars</span>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Technical */}
          <TabsContent value="technical" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Modelo de IA</CardTitle></CardHeader>
                <CardContent>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">GPT-4o (Mais inteligente)</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Rápido e econômico)</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Criatividade (Temperatura)</CardTitle>
                    <Badge variant="outline">{temperature.toFixed(2)}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Slider value={[temperature]} onValueChange={([v]) => setTemperature(v)} min={0} max={1} step={0.05} className="w-full" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>🎯 Preciso</span>
                    <span>⚖️ Equilibrado</span>
                    <span>🎨 Criativo</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Tamanho da Resposta</CardTitle></CardHeader>
                <CardContent>
                  <Select value={maxResponseLength} onValueChange={setMaxResponseLength}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Curta e direta</SelectItem>
                      <SelectItem value="medium">Média (recomendado)</SelectItem>
                      <SelectItem value="long">Detalhada</SelectItem>
                      <SelectItem value="unlimited">Sem limite</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="mt-3">
                    <Label className="text-xs">Max Tokens</Label>
                    <Input type="number" value={maxTokens} onChange={e => setMaxTokens(Math.min(4000, Math.max(100, Number(e.target.value))))} min={100} max={4000} className="mt-1 w-32" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Postura em Debate Multi-Agente</CardTitle></CardHeader>
                <CardContent>
                  <Select value={debatePosture} onValueChange={setDebatePosture}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aggressive">🔥 Agressivo — Ataca pontos fracos</SelectItem>
                      <SelectItem value="critical">🔍 Crítico — Questiona tudo (recomendado)</SelectItem>
                      <SelectItem value="neutral">⚖️ Neutro — Analisa com equilíbrio</SelectItem>
                      <SelectItem value="collaborative">🤝 Colaborativo — Constrói sobre ideias</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: Access */}
          <TabsContent value="access" className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Nível de acesso mínimo</Label>
                    <Select value={minAccessLevel} onValueChange={setMinAccessLevel}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strategic">Estratégico (Diretoria)</SelectItem>
                        <SelectItem value="tactical">Tático (Gerentes)</SelectItem>
                        <SelectItem value="operational">Operacional (Todos)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridade (0-10)</Label>
                    <Input type="number" value={priorityOrder} onChange={e => setPriorityOrder(Math.min(10, Math.max(0, Number(e.target.value))))} min={0} max={10} className="mt-1 w-32" />
                    <p className="text-xs text-muted-foreground mt-1">Menor = fala primeiro em debates</p>
                  </div>
                </div>

                {existingAgent && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                    <div>
                      <Label className="text-xs text-muted-foreground">Criado em</Label>
                      <p className="text-sm">{new Date(existingAgent.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Última atualização</Label>
                      <p className="text-sm">{existingAgent.updated_at ? new Date(existingAgent.updated_at).toLocaleString('pt-BR') : '—'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: Preview */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🧪 Testar Agente</CardTitle>
                <p className="text-xs text-muted-foreground">Teste o agente antes de salvar para garantir que está se comportando como esperado</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  rows={3}
                  placeholder="Digite uma pergunta para testar..."
                />
                <Button onClick={handleTest} disabled={testing || !testMessage.trim()}>
                  {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Testar Agente
                </Button>
                {testResponse && (
                  <div className="border border-border rounded-lg p-4 bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-2">Resposta:</p>
                    <p className="text-sm whitespace-pre-wrap">{testResponse}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sticky bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 flex justify-end gap-3 z-50">
          <Button variant="outline" onClick={() => navigate('/ai-lab/agents')}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || !slug.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Agente
          </Button>
        </div>
      </div>
    </Layout>
  );
}
