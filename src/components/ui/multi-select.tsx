import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select items...',
  emptyMessage = 'No items found.',
  className,
}) => {
  const [open, setOpen] = React.useState(false);

  const selectedLabels = value.map(v => 
    options.find(option => option.value === v)?.label || v
  );

  const handleUnselect = (item: string) => {
    onChange(value.filter(i => i !== item));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between hover:bg-background',
            value.length > 0 ? 'h-full' : 'h-10',
            className
          )}
          onClick={() => setOpen(!open)}
        >
          <div className="flex flex-wrap gap-1">
            {value.length > 0 ? (
              selectedLabels.map(label => (
                <Badge
                  key={label}
                  variant="secondary"
                  className="mr-1 mb-1"
                >
                  {label}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUnselect(value[selectedLabels.indexOf(label)]);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUnselect(value[selectedLabels.indexOf(label)]);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map(option => (
              <CommandItem
                key={option.value}
                onSelect={() => {
                  onChange(
                    value.includes(option.value)
                      ? value.filter(i => i !== option.value)
                      : [...value, option.value]
                  );
                  setOpen(true);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value.includes(option.value) ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}; 
