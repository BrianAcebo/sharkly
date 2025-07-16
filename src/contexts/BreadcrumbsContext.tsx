import { createContext } from 'react';

interface BreadcrumbsContextType {
  title: string;
  breadcrumbs: string[];
  setTitle: (title: string) => void;
  setBreadcrumbs: (breadcrumbs: string[]) => void;
}

export const BreadcrumbsContext = createContext<BreadcrumbsContextType | undefined>(undefined);