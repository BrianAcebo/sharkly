import { createContext, useContext, useState, useCallback } from 'react';

interface ActiveCallState {
  callId: string | null;
}

const ActiveCallContext = createContext<{
  state: ActiveCallState;
  setState: React.Dispatch<React.SetStateAction<ActiveCallState>>;
} | null>(null);

export const ActiveCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ActiveCallState>({ callId: null });
  return <ActiveCallContext.Provider value={{ state, setState }}>{children}</ActiveCallContext.Provider>;
};

export const useActiveCall = () => {
  const ctx = useContext(ActiveCallContext);
  if (!ctx) {
    throw new Error('useActiveCall must be used within ActiveCallProvider');
  }
  return ctx;
};
