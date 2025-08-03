import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { TeamMember } from '../types/leads';
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
        .from('team_members')
        .select('*, profile:profiles(*)')
        .eq('organization_id', user.organization_id);

      if (membersError) {
        throw new Error('Failed to fetch team members');
      }

      // Transform the data to include avatar URLs
      const transformedMembers = (members || []).map((member) => {
        let avatarUrl = '';
        if (member.profile.avatar) {
          const { data: imageUrl } = supabase.storage
            .from('avatars')
            .getPublicUrl(member.profile.avatar);

          if (imageUrl?.publicUrl) {
            avatarUrl = imageUrl.publicUrl;
          }
        }

        return {
          ...member,
          profile: {
            ...member.profile,
            avatar: avatarUrl
          }
        };
      });

      setTeamMembers(transformedMembers);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team members');
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