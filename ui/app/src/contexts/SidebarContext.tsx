import { createContext } from 'react';

interface SidebarContextType {
  isExpanded: boolean;
  isMobileOpen: boolean;
  activeItem: string | null;
  openSubmenu: string | null;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  toggleSubmenu: (item: string) => void;
  setActiveItem: (item: string) => void;
  setOpenSubmenu: (item: string) => void;
}

export const SidebarContext = createContext<SidebarContextType | undefined>(undefined);
