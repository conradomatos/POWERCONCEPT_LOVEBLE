
-- AI Lab: ai_threads
CREATE TABLE public.ai_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  thread_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  agent_type TEXT DEFAULT 'default',
  project_id UUID REFERENCES public.projetos(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own threads" ON public.ai_threads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_ai_threads_user ON public.ai_threads(user_id);
CREATE INDEX idx_ai_threads_status ON public.ai_threads(status);

CREATE TRIGGER update_ai_threads_updated_at BEFORE UPDATE ON public.ai_threads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_ai_thread_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'archived', 'paused') THEN
    RAISE EXCEPTION 'Invalid thread status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_ai_thread_status_trigger BEFORE INSERT OR UPDATE ON public.ai_threads FOR EACH ROW EXECUTE FUNCTION public.validate_ai_thread_status();

-- AI Lab: ai_messages
CREATE TABLE public.ai_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES public.ai_threads(thread_id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  agent_type TEXT,
  metadata JSONB DEFAULT '{}',
  is_favorited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage messages in own threads" ON public.ai_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ai_threads WHERE ai_threads.thread_id = ai_messages.thread_id AND ai_threads.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_threads WHERE ai_threads.thread_id = ai_messages.thread_id AND ai_threads.user_id = auth.uid()));
CREATE INDEX idx_ai_messages_thread ON public.ai_messages(thread_id);
CREATE INDEX idx_ai_messages_created ON public.ai_messages(created_at);

-- Validation trigger for role
CREATE OR REPLACE FUNCTION public.validate_ai_message_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.role NOT IN ('user', 'assistant', 'system') THEN
    RAISE EXCEPTION 'Invalid message role: %', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_ai_message_role_trigger BEFORE INSERT OR UPDATE ON public.ai_messages FOR EACH ROW EXECUTE FUNCTION public.validate_ai_message_role();

-- AI Lab: ai_agents
CREATE TABLE public.ai_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  avatar_icon TEXT DEFAULT 'Bot',
  avatar_color TEXT DEFAULT '#3b82f6',
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agents" ON public.ai_agents FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI Lab: ai_prompt_templates
CREATE TABLE public.ai_prompt_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  agent_type TEXT,
  usage_count INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own templates" ON public.ai_prompt_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ai_prompt_templates_updated_at BEFORE UPDATE ON public.ai_prompt_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AI Lab: ai_settings
CREATE TABLE public.ai_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  api_url TEXT,
  api_key TEXT,
  default_agent TEXT DEFAULT 'default',
  is_connected BOOLEAN DEFAULT false,
  last_connection_test TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON public.ai_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ai_settings_updated_at BEFORE UPDATE ON public.ai_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
