import { createContext } from 'react';

export interface KnowledgeBaseItem {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'faq' | 'script';
  createdAt: string;
  updatedAt: string;
}

export interface EmailSequence {
  id: string;
  name: string;
  description: string;
  emails: {
    id: string;
    subject: string;
    content: string;
    delayDays: number;
    order: number;
  }[];
  active: boolean;
  createdAt: string;
}

export interface TextSequence {
  id: string;
  name: string;
  description: string;
  messages: {
    id: string;
    content: string;
    delayHours: number;
    order: number;
  }[];
  active: boolean;
  createdAt: string;
}

export interface CallQuestionnaire {
  id: string;
  name: string;
  description: string;
  questions: {
    id: string;
    question: string;
    type: 'open' | 'yes_no' | 'multiple_choice';
    options?: string[];
    order: number;
    required: boolean;
  }[];
  active: boolean;
  createdAt: string;
}

interface AssistantContextType {
  knowledgeBase: KnowledgeBaseItem[];
  emailSequences: EmailSequence[];
  textSequences: TextSequence[];
  callQuestionnaires: CallQuestionnaire[];
  addKnowledgeBaseItem: (item: Omit<KnowledgeBaseItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateKnowledgeBaseItem: (id: string, updates: Partial<KnowledgeBaseItem>) => void;
  deleteKnowledgeBaseItem: (id: string) => void;
  addEmailSequence: (sequence: Omit<EmailSequence, 'id' | 'createdAt'>) => void;
  updateEmailSequence: (id: string, updates: Partial<EmailSequence>) => void;
  deleteEmailSequence: (id: string) => void;
  addTextSequence: (sequence: Omit<TextSequence, 'id' | 'createdAt'>) => void;
  updateTextSequence: (id: string, updates: Partial<TextSequence>) => void;
  deleteTextSequence: (id: string) => void;
  addCallQuestionnaire: (questionnaire: Omit<CallQuestionnaire, 'id' | 'createdAt'>) => void;
  updateCallQuestionnaire: (id: string, updates: Partial<CallQuestionnaire>) => void;
  deleteCallQuestionnaire: (id: string) => void;
}

export const AssistantContext = createContext<AssistantContextType | undefined>(undefined); 