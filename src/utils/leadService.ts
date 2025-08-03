import { getLeads, getLead, createLead, updateLead, deleteLead } from '../api/leads';
import { Lead, CreateLeadData, UpdateLeadData, Communication } from '../types/leads';
import { parseSupabaseError } from './error';

// Get all leads for the current user's organization
export async function getLeadsService(organizationId?: string): Promise<Lead[]> {
  try {
    const response = await getLeads({}, 1, 100, organizationId);
    return response.leads;
  } catch (error) {
    throw parseSupabaseError(error);
  }
}

// Get a single lead by ID
export async function getLeadByIdService(id: string): Promise<Lead> {
  try {
    return await getLead(id);
  } catch (error) {
    throw parseSupabaseError(error);
  }
}

// Create a new lead
export async function createLeadService(leadData: CreateLeadData): Promise<Lead> {
  try {
    return await createLead(leadData);
  } catch (error) {
    throw parseSupabaseError(error);
  }
}

// Update an existing lead
export async function updateLeadService(id: string, updateData: UpdateLeadData): Promise<Lead> {
  try {
    return await updateLead(id, updateData);
  } catch (error) {
    throw parseSupabaseError(error);
  }
}

// Delete a lead
export async function deleteLeadService(id: string): Promise<void> {
  try {
    await deleteLead(id);
  } catch (error) {
    throw parseSupabaseError(error);
  }
}

// Get communications for a lead
export async function getLeadCommunicationsService(leadId: string): Promise<Communication[]> {
  try {
    const lead = await getLead(leadId);
    return lead.communications || [];
  } catch (error) {
    throw parseSupabaseError(error);
  }
}

// Add a communication to a lead
export async function addCommunicationService(): Promise<Communication> {
  // This would need to be implemented in the API layer
  // For now, we'll throw an error indicating it needs to be implemented
  throw new Error('addCommunication method needs to be implemented in the API layer');
}

// Search leads
export async function searchLeadsService(query: string, organizationId?: string): Promise<Lead[]> {
  try {
    const response = await getLeads({ search: query }, 1, 100, organizationId);
    return response.leads;
  } catch (error) {
    throw parseSupabaseError(error);
  }
}

// Get leads by stage
export async function getLeadsByStageService(stage: string, organizationId?: string): Promise<Lead[]> {
  try {
    const response = await getLeads({ stage: stage as 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed-won' | 'closed-lost' }, 1, 100, organizationId);
    return response.leads;
  } catch (error) {
    throw parseSupabaseError(error);
  }
} 