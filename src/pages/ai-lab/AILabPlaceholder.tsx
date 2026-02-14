import Layout from '@/components/Layout';
import { PlaceholderPage } from '@/components/ai-lab/PlaceholderPage';
import { Archive, BarChart3, ScrollText } from 'lucide-react';

const pages: Record<string, { icon: typeof Archive; title: string; subtitle: string }> = {
  artifacts: { icon: Archive, title: 'Biblioteca de Artefatos', subtitle: 'Salve tabelas, códigos e relatórios gerados pela IA para consulta rápida' },
  analytics: { icon: BarChart3, title: 'Analytics', subtitle: 'Métricas de uso, performance dos agentes e insights' },
  logs: { icon: ScrollText, title: 'Logs e Auditoria', subtitle: 'Registro completo de todas as interações com os agentes de IA' },
};

export default function AILabPlaceholder({ page }: { page: 'artifacts' | 'analytics' | 'logs' }) {
  const config = pages[page];
  return (
    <Layout>
      <PlaceholderPage icon={config.icon} title={config.title} subtitle={config.subtitle} />
    </Layout>
  );
}
