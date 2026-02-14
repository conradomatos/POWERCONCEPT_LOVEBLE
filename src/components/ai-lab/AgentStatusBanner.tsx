interface AgentStatusBannerProps {
  agentType?: string;
}

const agentLabels: Record<string, string> = {
  default: 'Agente',
  engineer: 'Engenheiro',
  auditor: 'Auditor',
};

export function AgentStatusBanner({ agentType = 'default' }: AgentStatusBannerProps) {
  const label = agentLabels[agentType] || 'Agente';
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-t border-border text-sm text-muted-foreground">
      <span className="flex gap-1">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
      </span>
      <span>{label} está pensando...</span>
    </div>
  );
}
