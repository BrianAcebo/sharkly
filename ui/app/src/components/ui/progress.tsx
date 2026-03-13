import * as React from 'react';
import { cn } from '../../utils/common';

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: number;
    max?: number;
  }
>(({ className, value, max = 100, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
        className
      )}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${(value ?? 0) / max * 100}%` }}
      />
    </div>
  );
});
Progress.displayName = 'Progress';

export { Progress };
