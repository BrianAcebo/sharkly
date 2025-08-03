import { supabase } from '../utils/supabaseClient';
import { Lead, CreateLeadData, UpdateLeadData, TeamMember } from '../types/leads';
import { parseSupabaseError } from '../utils/error';

export interface LeadsFilters {
  search?: string;
  status?: 'active' | 'in_progress' | 'closed' | 'all';
  priority?: 'low' | 'medium' | 'high' | 'critical' | 'all';
  stage?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed-won' | 'closed-lost' | 'all';
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  sortBy?: 'created_at' | 'name' | 'priority' | 'value';
  sortOrder?: 'asc' | 'desc';
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * Helper function to fetch team member data
 */
async function fetchTeamMember(teamMemberId: string): Promise<TeamMember | null> {
  if (!teamMemberId) return null;
  
  try {
    const { data, error } = await supabase
      .from('user_organizations')
      .select(`
        user_id,
        role,
        organization_id,
        profile:profiles(
          id,
          first_name,
          last_name,
          avatar,
          completed_onboarding
        )
      `)
      .eq('user_id', teamMemberId)
      .single();

    if (error || !data) return null;

    // Handle avatar URL
    let avatarUrl = '';
    const profile = Array.isArray(data.profile) ? data.profile[0] : data.profile;
    if (profile?.avatar) {
      const { data: imageUrl } = supabase.storage
        .from('avatars')
        .getPublicUrl(profile.avatar);

      if (imageUrl?.publicUrl) {
        avatarUrl = imageUrl.publicUrl;
      }
    }

    return {
      id: data.user_id,
      organization_id: data.organization_id || '',
      role: data.role,
      profile: {
        id: profile?.id || '',
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        avatar: avatarUrl,
        completed_onboarding: profile?.completed_onboarding || false
      }
    };
  } catch (error) {
    console.error('Error fetching team member:', error);
    return null;
  }
}

/**
 * Temporary function to check all leads in database
 */
export async function getAllLeads(): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*');

    if (error) {
      console.error('Error fetching all leads:', error);
      return [];
    }

    console.log('All leads in database:', data);
    return data || [];
  } catch (error) {
    console.error('Error in getAllLeads:', error);
    return [];
  }
}

/**
 * Get leads with filtering, sorting, and pagination
 */
export async function getLeads(
  filters: LeadsFilters = {},
  page: number = 1,
  perPage: number = 10,
  organizationId: string
): Promise<LeadsResponse> {
  try {
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    console.log(organizationId, filters, page, perPage)



    // Apply filters
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }

    if (filters.stage && filters.stage !== 'all') {
      query = query.eq('stage', filters.stage);
    }

    if (filters.dateRange?.from) {
      query = query.gte('created_at', filters.dateRange.from.toISOString());
    }

    if (filters.dateRange?.to) {
      query = query.lte('created_at', filters.dateRange.to.toISOString());
    }

    // Apply sorting
    if (filters.sortBy) {
      const order = filters.sortOrder || 'desc';
      query = query.order(filters.sortBy, { ascending: order === 'asc' });
    } else {
      // Default sorting by created_at desc
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    console.log("here", data, error, count)

    const total = count || 0;
    const totalPages = Math.ceil(total / perPage);

    // Transform data to match Lead type
    const leads: Lead[] = await Promise.all((data || []).map(async (lead) => {
      // Handle assigned_to team member data
      const assignedTo = await fetchTeamMember(lead.assigned_to) || {
        id: lead.assigned_to || '',
        organization_id: lead.organization_id || '',
        role: 'analyst' as const,
        profile: {
          id: lead.assigned_to || '',
          first_name: '',
          last_name: '',
          avatar: '',
          completed_onboarding: false
        }
      };

      return {
        ...lead,
        assigned_to: assignedTo,
        communications: []
      };
    }));

    console.log('leads', leads);

    return {
      leads,
      total,
      page,
      perPage,
      totalPages
    };
  } catch (error) {
    console.error('Error fetching leads:', error);
    throw parseSupabaseError(error);
  }
}

/**
 * Get a single lead by ID
 */
export async function getLead(id: string): Promise<Lead> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Lead not found');
    }

    // Transform data to match Lead type
    const assignedTo = await fetchTeamMember(data.assigned_to) || {
      id: data.assigned_to || '',
      organization_id: data.organization_id || '',
      role: 'analyst' as const,
      profile: {
        id: data.assigned_to || '',
        first_name: '',
        last_name: '',
        avatar: '',
        completed_onboarding: false
      }
    };

    const lead: Lead = {
      ...data,
      assigned_to: assignedTo,
      communications: []
    };

    return lead;
  } catch (error) {
    console.error('Error fetching lead:', error);
    throw parseSupabaseError(error);
  }
}

/**
 * Create a new lead
 */
export async function createLead(leadData: CreateLeadData): Promise<Lead> {
  try {
    // Prepare the data for insertion, extracting assigned_to_id
    const insertData = {
      ...leadData,
      assigned_to: leadData.assigned_to?.id || null
    };

    const { data, error } = await supabase
      .from('leads')
      .insert([insertData])
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Transform data to match Lead type
    const assignedTo = {
      id: data.assigned_to || '',
      organizationId: data.organization_id || '',
      role: 'analyst' as const,
      profile: {
        id: data.assigned_to || '',
        first_name: '',
        last_name: '',
        avatar: '',
        completed_onboarding: false
      }
    };

    const lead: Lead = {
      ...data,
      assigned_to: assignedTo,
      communications: []
    };

    return lead;
  } catch (error) {
    console.error('Error creating lead:', error);
    throw parseSupabaseError(error);
  }
}

/**
 * Update an existing lead
 */
export async function updateLead(id: string, leadData: UpdateLeadData): Promise<Lead> {
  try {
    // Prepare the data for update, extracting assigned_to_id
    const updateData = {
      ...leadData,
      assigned_to: leadData.assigned_to?.id || null
    };

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Transform data to match Lead type
    const assignedTo = {
      id: data.assigned_to || '',
      organizationId: data.organization_id || '',
      role: 'analyst' as const,
      profile: {
        id: data.assigned_to || '',
        first_name: '',
        last_name: '',
        avatar: '',
        completed_onboarding: false
      }
    };

    const lead: Lead = {
      ...data,
      assigned_to: assignedTo,
      communications: []
    };

    return lead;
  } catch (error) {
    console.error('Error updating lead:', error);
    throw parseSupabaseError(error);
  }
}

/**
 * Delete a lead
 */
export async function deleteLead(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw parseSupabaseError(error);
  }
}

/**
 * Get lead statistics
 */
export async function getLeadStats(organizationId?: string): Promise<{
  total: number;
  active: number;
  inProgress: number;
  closed: number;
  byStage: Record<string, number>;
  byPriority: Record<string, number>;
}> {
  try {
    let query = supabase.from('leads').select('*');
    
    // Filter by organization if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate statistics
    const total = data?.length || 0;
    const active = data?.filter(lead => lead.status === 'active').length || 0;
    const inProgress = data?.filter(lead => lead.status === 'in_progress').length || 0;
    const closed = data?.filter(lead => lead.status === 'closed').length || 0;

    const byStage = data?.reduce((acc, lead) => {
      acc[lead.stage] = (acc[lead.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const byPriority = data?.reduce((acc, lead) => {
      acc[lead.priority] = (acc[lead.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return {
      total,
      active,
      inProgress,
      closed,
      byStage,
      byPriority
    };
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    throw parseSupabaseError(error);
  }
} 