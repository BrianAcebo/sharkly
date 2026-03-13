import { useContext } from 'react';
import { AssistantContext } from '../contexts/AssistantContext';

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
}; 