import * as React from 'react';
import { cn } from '../../utils/common';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className={cn('relative group', className)}>
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-max -translate-x-1/2 scale-0 rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100">
        {content}
      </span>
    </span>
  );
}
