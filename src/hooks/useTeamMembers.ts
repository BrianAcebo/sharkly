import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { TeamMember, UserProfile } from '../types/profile';
import useAuth from './useAuth';

export const useTeamMembers = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchTeamMembers = useCallback(async () => {
    if (!user?.organization_id) {
      setError('No organization found');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: members, error: membersError } = await supabase
        .from('user_organizations')
        .select(`
          role,
          organization_id,
          profile:user_id (
            id,
            first_name,
            last_name,
            avatar,
            completed_onboarding
          )
        `)
        .eq('organization_id', user.organization_id);

      if (membersError) {
        throw membersError;
      }

      // Transform the data to include avatar URLs and match TeamMember interface
      const transformedMembers: TeamMember[] = (members || []).map((member) => {
        let avatarUrl = '';
        const profile = member.profile as unknown as UserProfile; // Direct reference since we're using foreign key
        
        if (profile?.avatar) {
          const { data: imageUrl } = supabase.storage
            .from('avatars')
            .getPublicUrl(profile.avatar);

          if (imageUrl?.publicUrl) {
            avatarUrl = imageUrl.publicUrl;
          }
        }

        return {
          id: profile?.id || 'unknown',
          organization_id: member.organization_id,
          role: member.role,
          profile: {
            id: profile?.id || 'unknown',
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            avatar: avatarUrl,
            completed_onboarding: profile?.completed_onboarding || false
          }
        };
      });

      setTeamMembers(transformedMembers);
    } catch {
      throw new Error('Failed to fetch team members');
    } finally {
      setIsLoading(false);
    }
  }, [user?.organization_id]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  return {
    teamMembers,
    isLoading,
    error,
    refetch: fetchTeamMembers
  };
}; 