import { getLeads, getLead, createLead, updateLead, deleteLead, LeadsFilters } from '../api/leads';
import { Lead, CreateLeadData, UpdateLeadData, Communication } from '../types/leads';
import { parseSupabaseError } from './error';

// Get all leads for the current user's organization
export async function getLeadsService(organizationId: string): Promise<Lead[]> {
	try {
		const response = await getLeads({}, 1, 1000, organizationId);
		return response.leads;
	} catch (error) {
		throw parseSupabaseError(error);
	}
}

// Get all leads for export (with filters applied)
export async function getAllLeadsForExport(organizationId: string, filters: LeadsFilters): Promise<Lead[]> {
	try {
		const response = await getLeads(filters, 1, 1000, organizationId);
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
export async function searchLeadsService(query: string, organizationId: string): Promise<Lead[]> {
  try {
    const response = await getLeads({ search: query }, 1, 100, organizationId);
    return response.leads;
  } catch (error) {
    throw parseSupabaseError(error);
  }
}

// Get leads by stage
export async function getLeadsByStageService(stage: string, organizationId: string): Promise<Lead[]> {
  try {
    const response = await getLeads({ stage: stage as 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed-won' | 'closed-lost' }, 1, 100, organizationId);
    return response.leads;
  } catch (error) {
    throw parseSupabaseError(error);
  }
}

// Bulk update leads
export async function bulkUpdateLeadsService(leadIds: string[], updates: Partial<Lead>): Promise<void> {
  try {
    // Update each lead individually (could be optimized with a batch update API)
    // TODO: Implement bulkUpdateLeads in API layer for better performance
    await Promise.all(leadIds.map(id => updateLead(id, updates)));
  } catch (error) {
    throw parseSupabaseError(error);
  }
}

// Bulk delete leads
export async function bulkDeleteLeadsService(leadIds: string[]): Promise<void> {
  try {
    // Delete each lead individually (could be optimized with a batch delete API)
    // TODO: Implement bulkDeleteLeads in API layer for better performance
    await Promise.all(leadIds.map(id => deleteLead(id)));
  } catch (error) {
    throw parseSupabaseError(error);
  }
}

// Bulk import leads
export async function bulkImportLeadsService(leads: CreateLeadData[]): Promise<void> {
  try {
    // Use the new bulk create API for better performance
    const { bulkCreateLeads } = await import('../api/leads');
    await bulkCreateLeads(leads);
  } catch (error) {
    throw parseSupabaseError(error);
  }
} 