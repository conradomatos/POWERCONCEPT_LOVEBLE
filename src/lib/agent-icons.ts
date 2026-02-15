import {
  Bot, Calculator, ShieldCheck, HardHat,
  Briefcase, Scale, ClipboardCheck, Users
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
};

export const AGENT_ICON_OPTIONS = [
  { value: 'bot', label: 'Bot' },
  { value: 'calculator', label: 'Calculator' },
  { value: 'shield-check', label: 'Shield Check' },
  { value: 'hard-hat', label: 'Hard Hat' },
  { value: 'briefcase', label: 'Briefcase' },
  { value: 'scale', label: 'Scale' },
  { value: 'clipboard-check', label: 'Clipboard Check' },
  { value: 'users', label: 'Users' },
];
