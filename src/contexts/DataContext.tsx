import { createContext } from 'react';
import { TeamMember } from '../types/leads';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed-won' | 'closed-lost';
  value: number;
  lastContact: string;
  notes: string;
  communications: Communication[];
  avatar?: string;
	title: string;
	description: string;
	category: string;
	status: 'active' | 'in_progress' | 'closed';
	priority: 'low' | 'medium' | 'high' | 'critical';
	tags: string[];
	assignedTo: TeamMember[];
	createdAt: Date;
	updatedAt: Date;
}

export interface Communication {
  id: string;
  type: 'email' | 'text' | 'call';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content: string;
  timestamp: string;
  duration?: number; // for calls
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

interface DataContextType {
  leads: Lead[];
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'communications'>) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  addCommunication: (leadId: string, communication: Omit<Communication, 'id'>) => void;
  getLeadById: (id: string) => Lead | undefined;
}

export const DataContext = createContext<DataContextType | undefined>(undefined); 