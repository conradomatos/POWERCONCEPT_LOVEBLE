interface AgentStatusBannerProps {
  agentName?: string;
  agentColor?: string;
}

export function AgentStatusBanner({ agentName = 'Agente', agentColor }: AgentStatusBannerProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-t border-border text-sm text-muted-foreground">
      <span className="flex gap-1">
        <span className="animate-bounce" style={{ animationDelay: '0ms', color: agentColor }}>●</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms', color: agentColor }}>●</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms', color: agentColor }}>●</span>
      </span>
      <span>
        <strong style={{ color: agentColor }}>{agentName}</strong> está pensando...
      </span>
    </div>
  );
}
