import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Lead, CreateLeadData, UpdateLeadData } from '../types/leads';
import { getLeads, getLead, createLead, updateLead, deleteLead, LeadsFilters, LeadsResponse } from '../api/leads';
import { useAuth } from '../contexts/AuthContext';

export interface UseLeadsState {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  filters: LeadsFilters;
}

export interface UseLeadsActions {
  fetchLeads: (filters?: LeadsFilters, page?: number) => Promise<void>;
  createLead: (leadData: CreateLeadData) => Promise<Lead | null>;
  updateLead: (id: string, leadData: UpdateLeadData) => Promise<Lead | null>;
  deleteLead: (id: string) => Promise<boolean>;
  getLeadById: (id: string) => Promise<Lead | null>;
  refreshLeads: () => Promise<void>;
}

export const useLeads = (): UseLeadsState & UseLeadsActions => {
  const { user } = useAuth();
  const [state, setState] = useState<UseLeadsState>({
    leads: [],
    loading: false,
    error: null,
    total: 0,
    page: 1,
    perPage: 10,
    totalPages: 0,
    filters: {}
  });

  const fetchLeads = useCallback(async (filters?: LeadsFilters, page?: number) => {
    console.log('useLeads - fetchLeads called with user:', user);
    console.log('useLeads - user.organization_id:', user?.organization_id);
    
    if (!user?.organization_id) {
      console.log('useLeads - No organization_id, skipping fetch');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('useLeads - Calling getLeads with organization_id:', user.organization_id);
      const response: LeadsResponse = await getLeads(
        filters || state.filters,
        page || state.page,
        state.perPage,
        user.organization_id
      );
      
      console.log('useLeads - getLeads response:', response);
      
      setState(prev => ({
        ...prev,
        leads: response.leads,
        total: response.total,
        page: response.page,
        totalPages: response.totalPages,
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching leads:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch leads';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
      toast.error(`Failed to fetch leads: ${errorMessage}`);
    }
  }, [state.filters, state.page, state.perPage, user?.organization_id]);

  // Fetch leads when user or organization changes
  useEffect(() => {
    if (user?.organization_id) {
      fetchLeads();
    }
  }, [user?.organization_id, fetchLeads]);

  const createLeadAction = useCallback(async (leadData: CreateLeadData): Promise<Lead | null> => {
    if (!user?.organization_id) {
      toast.error('No organization ID available');
      return null;
    }

    try {
      const newLead = await createLead({
        ...leadData,
        organization_id: user.organization_id
      } as CreateLeadData & { organization_id: string });
      toast.success('Lead created successfully!');
      
      // Refresh the leads list
      await fetchLeads();
      
      return newLead;
    } catch (error) {
      console.error('Error creating lead:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create lead';
      toast.error(`Failed to create lead: ${errorMessage}`);
      return null;
    }
  }, [fetchLeads, user?.organization_id]);

  const updateLeadAction = useCallback(async (id: string, leadData: UpdateLeadData): Promise<Lead | null> => {
    try {
      const updatedLead = await updateLead(id, leadData);
      toast.success('Lead updated successfully!');
      
      // Refresh the leads list
      await fetchLeads();
      
      return updatedLead;
    } catch (error) {
      console.error('Error updating lead:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update lead';
      toast.error(`Failed to update lead: ${errorMessage}`);
      return null;
    }
  }, [fetchLeads]);

  const deleteLeadAction = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteLead(id);
      toast.success('Lead deleted successfully!');
      
      // Refresh the leads list
      await fetchLeads();
      
      return true;
    } catch (error) {
      console.error('Error deleting lead:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete lead';
      toast.error(`Failed to delete lead: ${errorMessage}`);
      return false;
    }
  }, [fetchLeads]);

  const getLeadById = useCallback(async (id: string): Promise<Lead | null> => {
    try {
      const lead = await getLead(id);
      return lead;
    } catch (error) {
      console.error('Error fetching lead:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch lead';
      toast.error(`Failed to fetch lead: ${errorMessage}`);
      return null;
    }
  }, []);

  const refreshLeads = useCallback(async () => {
    await fetchLeads();
  }, [fetchLeads]);

  return {
    ...state,
    fetchLeads,
    createLead: createLeadAction,
    updateLead: updateLeadAction,
    deleteLead: deleteLeadAction,
    getLeadById,
    refreshLeads
  };
};

// Categories for filtering
export const priorityLevels = ['all', 'low', 'medium', 'high', 'critical'] as const;
export const caseStatuses = ['all', 'active', 'closed', 'in_progress'] as const;

// Legacy function for backward compatibility
export const getSearchResults = (): { results: Lead[]; total: number } => {
  // This is now handled by the useLeads hook with proper API calls
  // Keeping for backward compatibility but it will return empty results
  console.warn('getSearchResults is deprecated. Use useLeads hook instead.');
  return { results: [], total: 0 };
};