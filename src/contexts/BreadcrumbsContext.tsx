import { createContext } from 'react';

interface BreadcrumbsContextType {
  title: string;
  breadcrumbs: string[];
  setTitle: (title: string) => void;
  setBreadcrumbs: (breadcrumbs: string[]) => void;
  returnTo: { path: string; label: string } | null;
  setReturnTo: (returnTo: { path: string; label: string } | null) => void;
}

export const BreadcrumbsContext = createContext<BreadcrumbsContextType | undefined>(undefined);