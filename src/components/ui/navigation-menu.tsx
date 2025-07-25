import * as React from 'react';
import { cn } from '../../utils/common';

export interface NavigationMenuProps {
  items: { label: string; href: string }[];
  className?: string;
}

export function NavigationMenu({ items, className }: NavigationMenuProps) {
  return (
    <nav className={cn('flex space-x-4', className)}>
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-primary"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
