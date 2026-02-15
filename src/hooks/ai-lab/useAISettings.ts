import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AISettings {
  id: string;
  api_url: string | null;
  api_key: string | null;
  default_agent: string;
  is_connected: boolean;
  last_connection_test: string | null;
  settings: Record<string, unknown>;
}

export function useAISettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setSettings(data as unknown as AISettings);
    } else if (!data) {
      // Create default settings
      const { data: created } = await supabase
        .from('ai_settings')
        .insert({ user_id: user.id })
        .select()
        .single();
      if (created) setSettings(created as unknown as AISettings);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async (updates: Partial<Pick<AISettings, 'api_url' | 'api_key' | 'default_agent'>>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('ai_settings')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();
    if (!error && data) setSettings(data as unknown as AISettings);
    return { error };
  };

  const testConnection = async (url: string) => {
    try {
      const start = Date.now();
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;
      if (response.ok) {
        await supabase
          .from('ai_settings')
          .update({ is_connected: true, last_connection_test: new Date().toISOString() })
          .eq('user_id', user!.id);
        await fetchSettings();
        return { success: true, latency };
      }
      return { success: false, error: 'Servidor respondeu com erro' };
    } catch (err: any) {
      await supabase
        .from('ai_settings')
        .update({ is_connected: false, last_connection_test: new Date().toISOString() })
        .eq('user_id', user!.id);
      await fetchSettings();
      return { success: false, error: err.message || 'Falha na conexão' };
    }
  };

  return { settings, loading, saveSettings, testConnection, refetch: fetchSettings };
}
