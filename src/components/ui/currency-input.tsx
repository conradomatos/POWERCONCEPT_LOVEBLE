import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { applyCurrencyMask, getCurrencyNumericValue, formatCurrencyValue } from '@/lib/currency';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string;
  onValueChange: (value: number) => void;
  prefix?: string;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onValueChange, prefix = 'R$', disabled, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('');

    // Sync display value when external value changes
    React.useEffect(() => {
      const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : (value || 0);
      if (numericValue === 0 && displayValue === '') {
        return; // Don't override empty input with 0,00
      }
      const formatted = formatCurrencyValue(numericValue);
      if (formatted !== displayValue) {
        setDisplayValue(formatted);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const masked = applyCurrencyMask(inputValue);
      setDisplayValue(masked);
      
      const numericValue = getCurrencyNumericValue(masked);
      onValueChange(numericValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all on focus for easier editing
      e.target.select();
      props.onFocus?.(e);
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          {prefix}
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          className={cn('pl-10', className)}
          disabled={disabled}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
