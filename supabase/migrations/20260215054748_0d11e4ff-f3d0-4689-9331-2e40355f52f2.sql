
-- Drop existing RLS policies on ai_agents
DROP POLICY IF EXISTS "Users manage own agents" ON ai_agents;
DROP POLICY IF EXISTS "Users can manage their own agents" ON ai_agents;

-- Remove user_id column (make agents shared)
ALTER TABLE ai_agents DROP COLUMN IF EXISTS user_id;

-- Add new columns
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(user_id);
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Rename columns to match spec
ALTER TABLE ai_agents RENAME COLUMN avatar_icon TO icon;
ALTER TABLE ai_agents RENAME COLUMN avatar_color TO color;

-- Make system_prompt NOT NULL with default
ALTER TABLE ai_agents ALTER COLUMN system_prompt SET DEFAULT '';
UPDATE ai_agents SET system_prompt = '' WHERE system_prompt IS NULL;
ALTER TABLE ai_agents ALTER COLUMN system_prompt SET NOT NULL;

-- Set defaults for icon and color
ALTER TABLE ai_agents ALTER COLUMN icon SET DEFAULT 'bot';
ALTER TABLE ai_agents ALTER COLUMN color SET DEFAULT '#F59E0B';

-- New RLS policies
CREATE POLICY "Authenticated read active agents"
  ON ai_agents FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage agents"
  ON ai_agents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- Clear old per-user agents and seed defaults
DELETE FROM ai_agents;

INSERT INTO ai_agents (name, slug, icon, color, description, system_prompt) VALUES
('Assistente Geral', 'default', 'bot', '#F59E0B',
 'Assistente especializado em gestão de projetos de construção civil',
 'Voce e um assistente especializado em gestao de projetos de construcao civil. Responda sempre em portugues brasileiro. Seja direto e pratico.'),
('Engenheiro de Custos', 'engineer', 'calculator', '#3B82F6',
 'Especialista em orçamentação, SINAPI, SICRO e composições de custo',
 'Voce e um Engenheiro de Custos senior especializado em orcamentacao de obras. Responda em portugues brasileiro. Seja tecnico e preciso.'),
('Auditor Fiscal', 'auditor', 'shield-check', '#EF4444',
 'Especialista em conformidade, normas e fiscalização de obras',
 'Voce e um Auditor Fiscal especializado em obras publicas e privadas. Responda em portugues brasileiro. Seja rigoroso e detalhista.');

-- Add agent identity columns to ai_messages
ALTER TABLE ai_messages
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES ai_agents(id),
  ADD COLUMN IF NOT EXISTS agent_name text,
  ADD COLUMN IF NOT EXISTS agent_color text;
