import React, { useState } from 'react';
import { BreadcrumbsContext } from '../contexts/BreadcrumbsContext';

export const BreadcrumbsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
    const [title, setTitle] = useState<string>('');
  
    return (
      <BreadcrumbsContext.Provider value={{ title, breadcrumbs, setTitle, setBreadcrumbs }}>
        {children}
      </BreadcrumbsContext.Provider>
    );
  };    