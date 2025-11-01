import React, { useState } from 'react';
import { BreadcrumbsContext } from '../contexts/BreadcrumbsContext';

export const BreadcrumbsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
    const [title, setTitle] = useState<string>('');
    const [returnTo, setReturnTo] = useState<{ path: string; label: string } | null>(null);
  
    return (
      <BreadcrumbsContext.Provider value={{ title, breadcrumbs, setTitle, setBreadcrumbs, returnTo, setReturnTo }}>
        {children}
      </BreadcrumbsContext.Provider>
    );
  };    