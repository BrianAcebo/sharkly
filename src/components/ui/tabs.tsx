import * as React from 'react';
import { cn } from '../../utils/common';

export interface TabsProps {
  tabs: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex space-x-2', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium',
            value === tab.value
              ? 'bg-primary text-white shadow'
              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
