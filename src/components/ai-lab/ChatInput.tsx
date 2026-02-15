import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatInputProps {
  onSend: (message: string) => void;
  onSendRound?: (message: string) => void;
  showRoundButton?: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onSendRound, showRoundButton, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [value]);

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  const handleSendRound = () => {
    if (!value.trim() || disabled || !onSendRound) return;
    onSendRound(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border p-3 flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite sua mensagem..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50"
      />
      {showRoundButton && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" onClick={handleSendRound} disabled={!value.trim() || disabled}>
              <Users className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Todos Respondem</TooltipContent>
        </Tooltip>
      )}
      <Button size="icon" onClick={handleSend} disabled={!value.trim() || disabled}>
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
