import * as React from 'react';
import { cn } from '../../utils/common';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, className, tooltipPosition = 'top' }: TooltipProps) {
  const tooltipPositionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <span className={cn('relative group', className)}>
      {children}
      <span className={cn("pointer-events-none absolute z-10 mt-2 w-max scale-0 rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100", tooltipPositionClasses[tooltipPosition])}>
        {content}
      </span>
    </span>
  );
}
