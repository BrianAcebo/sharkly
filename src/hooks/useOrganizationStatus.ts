import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { OrgStatus } from '../types/billing';

interface OrganizationStatusData {
  org_status: OrgStatus;
  name: string;
}

export function useOrganizationStatus() {
  const { user } = useAuth();
  const [isLoading] = useState(false);
  const [status, setStatus] = useState<OrgStatus | null>(null);

  const getOrganizationStatus = useCallback(async () => {
    if (!user?.organization_id) {
      return null;
    }

    try {
      // Get session for authentication
      const { data: { session } } = await (await import('../utils/supabaseClient')).supabase.auth.getSession();
      if (!session) {
        return null;
      }

      const response = await fetch(`/api/organizations/${user.organization_id}/status`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get organization status');
      }

      const data = await response.json();
      console.log('[ORG_STATUS] Fetched organization status:', data.data);
      setStatus(data.data.org_status);
      return data.data as OrganizationStatusData;

    } catch (error) {
      console.error('Error getting organization status:', error);
      return null;
    }
  }, [user?.organization_id]);

  // Automatically fetch organization status when user changes
  useEffect(() => {
    if (user?.organization_id) {
      getOrganizationStatus();
    }
  }, [user?.organization_id, getOrganizationStatus]);

  // Remove manual update endpoints; rely solely on webhook-driven status.
  const updateOrganizationStatus = useCallback(async () => {
    toast.error('Manual status changes are disabled. Status is managed automatically.');
    return false;
  }, []);

  const isPaused = status === 'paused';
  const isDisabled = status === 'disabled';
  const isReadOnly = isPaused || isDisabled;

  return {
    status,
    isLoading,
    isPaused,
    isDisabled,
    isReadOnly,
    updateOrganizationStatus,
    getOrganizationStatus
  };
}
