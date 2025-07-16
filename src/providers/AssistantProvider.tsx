import React, { useState } from 'react';
import { AssistantContext, KnowledgeBaseItem, EmailSequence, TextSequence, CallQuestionnaire } from '../contexts/AssistantContext';

const mockKnowledgeBase: KnowledgeBaseItem[] = [
  {
    id: '1',
    title: 'Product Overview',
    content: 'Our CRM solution helps sales teams manage leads, track communications, and close more deals...',
    type: 'document',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-15'
  },
  {
    id: '2',
    title: 'Pricing FAQ',
    content: 'Q: What are your pricing plans?\nA: We offer three tiers: Starter ($29/month), Professional ($79/month), and Enterprise ($199/month)...',
    type: 'faq',
    createdAt: '2024-01-12',
    updatedAt: '2024-01-12'
  }
];

const mockEmailSequences: EmailSequence[] = [
  {
    id: '1',
    name: 'Welcome Series',
    description: 'Onboarding sequence for new leads',
    emails: [
      {
        id: '1',
        subject: 'Welcome to our CRM solution!',
        content: 'Hi {{firstName}}, thank you for your interest in our CRM solution...',
        delayDays: 0,
        order: 1
      },
      {
        id: '2',
        subject: 'Getting started with CRM',
        content: 'Hi {{firstName}}, I wanted to follow up and see if you had any questions...',
        delayDays: 3,
        order: 2
      }
    ],
    active: true,
    createdAt: '2024-01-10'
  }
];

export const AssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>(mockKnowledgeBase);
  const [emailSequences, setEmailSequences] = useState<EmailSequence[]>(mockEmailSequences);
  const [textSequences, setTextSequences] = useState<TextSequence[]>([]);
  const [callQuestionnaires, setCallQuestionnaires] = useState<CallQuestionnaire[]>([]);

  const addKnowledgeBaseItem = (itemData: Omit<KnowledgeBaseItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: KnowledgeBaseItem = {
      ...itemData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setKnowledgeBase(prev => [...prev, newItem]);
  };

  const updateKnowledgeBaseItem = (id: string, updates: Partial<KnowledgeBaseItem>) => {
    setKnowledgeBase(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    ));
  };

  const deleteKnowledgeBaseItem = (id: string) => {
    setKnowledgeBase(prev => prev.filter(item => item.id !== id));
  };

  const addEmailSequence = (sequenceData: Omit<EmailSequence, 'id' | 'createdAt'>) => {
    const newSequence: EmailSequence = {
      ...sequenceData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setEmailSequences(prev => [...prev, newSequence]);
  };

  const updateEmailSequence = (id: string, updates: Partial<EmailSequence>) => {
    setEmailSequences(prev => prev.map(seq => 
      seq.id === id ? { ...seq, ...updates } : seq
    ));
  };

  const deleteEmailSequence = (id: string) => {
    setEmailSequences(prev => prev.filter(seq => seq.id !== id));
  };

  const addTextSequence = (sequenceData: Omit<TextSequence, 'id' | 'createdAt'>) => {
    const newSequence: TextSequence = {
      ...sequenceData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setTextSequences(prev => [...prev, newSequence]);
  };

  const updateTextSequence = (id: string, updates: Partial<TextSequence>) => {
    setTextSequences(prev => prev.map(seq => 
      seq.id === id ? { ...seq, ...updates } : seq
    ));
  };

  const deleteTextSequence = (id: string) => {
    setTextSequences(prev => prev.filter(seq => seq.id !== id));
  };

  const addCallQuestionnaire = (questionnaireData: Omit<CallQuestionnaire, 'id' | 'createdAt'>) => {
    const newQuestionnaire: CallQuestionnaire = {
      ...questionnaireData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setCallQuestionnaires(prev => [...prev, newQuestionnaire]);
  };

  const updateCallQuestionnaire = (id: string, updates: Partial<CallQuestionnaire>) => {
    setCallQuestionnaires(prev => prev.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const deleteCallQuestionnaire = (id: string) => {
    setCallQuestionnaires(prev => prev.filter(q => q.id !== id));
  };

  return (
    <AssistantContext.Provider value={{
      knowledgeBase,
      emailSequences,
      textSequences,
      callQuestionnaires,
      addKnowledgeBaseItem,
      updateKnowledgeBaseItem,
      deleteKnowledgeBaseItem,
      addEmailSequence,
      updateEmailSequence,
      deleteEmailSequence,
      addTextSequence,
      updateTextSequence,
      deleteTextSequence,
      addCallQuestionnaire,
      updateCallQuestionnaire,
      deleteCallQuestionnaire
    }}>
      {children}
    </AssistantContext.Provider>
  );
}; 