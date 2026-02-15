import {
  Bot, Calculator, ShieldCheck, HardHat,
  Briefcase, Scale, ClipboardCheck, Users,
  Brain, Target, Swords, Flame,
  Gavel, Search, AlertTriangle
} from 'lucide-react';

export const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'bot': Bot,
  'calculator': Calculator,
  'shield-check': ShieldCheck,
  'hard-hat': HardHat,
  'briefcase': Briefcase,
  'scale': Scale,
  'clipboard-check': ClipboardCheck,
  'users': Users,
  'brain': Brain,
  'target': Target,
  'sword': Swords,
  'flame': Flame,
  'gavel': Gavel,
  'search': Search,
  'alert-triangle': AlertTriangle,
};

export const AGENT_ICON_OPTIONS = [
  { value: 'bot', label: 'Bot' },
  { value: 'calculator', label: 'Calculadora' },
  { value: 'shield-check', label: 'Escudo' },
  { value: 'hard-hat', label: 'Capacete' },
  { value: 'briefcase', label: 'Maleta' },
  { value: 'scale', label: 'Balança' },
  { value: 'clipboard-check', label: 'Checklist' },
  { value: 'users', label: 'Equipe' },
  { value: 'brain', label: 'Cérebro' },
  { value: 'target', label: 'Alvo' },
  { value: 'sword', label: 'Espada' },
  { value: 'flame', label: 'Chama' },
  { value: 'gavel', label: 'Martelo' },
  { value: 'search', label: 'Busca' },
  { value: 'alert-triangle', label: 'Alerta' },
];
