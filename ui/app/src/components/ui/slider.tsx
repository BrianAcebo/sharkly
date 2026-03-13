import * as React from 'react';
import { cn } from '../../utils/common';

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  min?: number;
  max?: number;
  step?: number;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(({ className, min = 0, max = 100, step = 1, ...props }, ref) => {
  return (
    <input
      type="range"
      ref={ref}
      min={min}
      max={max}
      step={step}
      className={cn(
        'w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700',
        className
      )}
      {...props}
    />
  );
});
Slider.displayName = 'Slider';

export { Slider };
