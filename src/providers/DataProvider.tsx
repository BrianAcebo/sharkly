import React, { useState } from 'react';
import { DataContext, Lead, Communication } from '../contexts/DataContext';

const mockLeads: Lead[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '+1 (555) 123-4567',
    company: 'TechCorp Solutions',
    stage: 'qualified',
    value: 25000,
    lastContact: '2024-01-15',
    assignedAgent: 'John Doe',
    notes: 'Interested in enterprise package. Follow up next week.',
    createdAt: '2024-01-10',
    communications: [
      {
        id: '1',
        type: 'email',
        direction: 'outbound',
        subject: 'Welcome to our CRM solution',
        content: 'Hi Sarah, thank you for your interest in our CRM solution...',
        timestamp: '2024-01-15T10:30:00Z',
        status: 'read'
      },
      {
        id: '2',
        type: 'call',
        direction: 'outbound',
        content: 'Discussed pricing and implementation timeline',
        timestamp: '2024-01-15T14:00:00Z',
        duration: 1800,
        status: 'sent'
      }
    ]
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael.chen@startup.io',
    phone: '+1 (555) 987-6543',
    company: 'Innovation Startup',
    stage: 'new',
    value: 15000,
    lastContact: '2024-01-14',
    assignedAgent: 'John Doe',
    notes: 'New lead from website form',
    createdAt: '2024-01-14',
    communications: [
      {
        id: '3',
        type: 'text',
        direction: 'inbound',
        content: 'Hi, I filled out your form and would like to learn more about your CRM',
        timestamp: '2024-01-14T09:15:00Z',
        status: 'delivered'
      }
    ]
  }
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);

  const addLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'communications'>) => {
    const newLead: Lead = {
      ...leadData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      communications: []
    };
    setLeads(prev => [...prev, newLead]);
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(lead => 
      lead.id === id ? { ...lead, ...updates } : lead
    ));
  };

  const deleteLead = (id: string) => {
    setLeads(prev => prev.filter(lead => lead.id !== id));
  };

  const addCommunication = (leadId: string, commData: Omit<Communication, 'id'>) => {
    const newCommunication: Communication = {
      ...commData,
      id: Date.now().toString()
    };
    
    setLeads(prev => prev.map(lead => 
      lead.id === leadId 
        ? { 
            ...lead, 
            communications: [...lead.communications, newCommunication],
            lastContact: new Date().toISOString().split('T')[0]
          }
        : lead
    ));
  };

  const getLeadById = (id: string) => {
    return leads.find(lead => lead.id === id);
  };

  return (
    <DataContext.Provider value={{
      leads,
      addLead,
      updateLead,
      deleteLead,
      addCommunication,
      getLeadById
    }}>
      {children}
    </DataContext.Provider>
  );
}; 