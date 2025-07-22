import { supabase } from './supabaseClient';
import { Lead, CreateLeadData, UpdateLeadData, Communication } from '../types/leads';
import { parseSupabaseError, AuthenticationError, AuthorizationError, DatabaseError } from './error';

export class LeadService {
  // Get all leads for the current user's organization
  static async getLeads(): Promise<Lead[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    // Get user's organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userOrgError) {
      throw parseSupabaseError(userOrgError);
    }

    if (!userOrg) {
      throw new AuthorizationError('User not associated with any organization');
    }

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', userOrg.organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw parseSupabaseError(error);
    }

    return data || [];
  }

  // Get a single lead by ID
  static async getLeadById(id: string): Promise<Lead> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw parseSupabaseError(error);
    }

    if (!data) {
      throw new DatabaseError('Lead not found', 'NOT_FOUND');
    }

    return data;
  }

  // Create a new lead
  static async createLead(leadData: CreateLeadData): Promise<Lead> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    // Get user's organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userOrgError) {
      throw parseSupabaseError(userOrgError);
    }

    if (!userOrg) {
      throw new AuthorizationError('User not associated with any organization');
    }

    const insertData = {
      ...leadData,
      organization_id: userOrg.organization_id,
      created_by: user.id,
      value: leadData.value || 0,
      status: leadData.status || 'active',
      priority: leadData.priority || 'low',
      tags: leadData.tags || [],
      last_contact: new Date().toISOString().split('T')[0]
    };

    const { data, error } = await supabase
      .from('leads')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      throw parseSupabaseError(error);
    }

    return data;
  }

  // Update an existing lead
  static async updateLead(id: string, updateData: UpdateLeadData): Promise<Lead> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    const { data, error } = await supabase
      .from('leads')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw parseSupabaseError(error);
    }

    if (!data) {
      throw new DatabaseError('Lead not found', 'NOT_FOUND');
    }

    return data;
  }

  // Delete a lead
  static async deleteLead(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      throw parseSupabaseError(error);
    }
  }

  // Get communications for a lead
  static async getLeadCommunications(leadId: string): Promise<Communication[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    const { data, error } = await supabase
      .from('communications')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      throw parseSupabaseError(error);
    }

    return data || [];
  }

  // Add a communication to a lead
  static async addCommunication(leadId: string, communicationData: Omit<Communication, 'id' | 'lead_id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<Communication> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    const { data, error } = await supabase
      .from('communications')
      .insert({
        ...communicationData,
        lead_id: leadId,
        created_by: user.id
      })
      .select('*')
      .single();

    if (error) {
      throw parseSupabaseError(error);
    }

    return data;
  }

  // Search leads
  static async searchLeads(query: string): Promise<Lead[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    // Get user's organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userOrgError) {
      throw parseSupabaseError(userOrgError);
    }

    if (!userOrg) {
      throw new AuthorizationError('User not associated with any organization');
    }

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', userOrg.organization_id)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      throw parseSupabaseError(error);
    }

    return data || [];
  }

  // Get leads by stage
  static async getLeadsByStage(stage: string): Promise<Lead[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    // Get user's organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userOrgError) {
      throw parseSupabaseError(userOrgError);
    }

    if (!userOrg) {
      throw new AuthorizationError('User not associated with any organization');
    }

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', userOrg.organization_id)
      .eq('stage', stage)
      .order('created_at', { ascending: false });

    if (error) {
      throw parseSupabaseError(error);
    }

    return data || [];
  }
} 