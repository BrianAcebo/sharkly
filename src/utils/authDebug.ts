// Utility for debugging auth state changes
export const authDebug = {
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Auth Debug] ${message}`, data || '');
    }
  },
  
  logUserState: (user: any, session: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth Debug] User State:', {
        hasUser: !!user,
        hasSession: !!session,
        userId: user?.id,
        userEmail: user?.email,
        userFirstName: user?.first_name,
        userLastName: user?.last_name,
        organizationId: user?.organization_id,
        completedOnboarding: user?.completed_onboarding,
        sessionExpiresAt: session?.expires_at,
        sessionAccessToken: session?.access_token ? 'present' : 'missing'
      });
    }
  },
  
  logAuthChange: (event: string, session: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Auth Debug] Auth Change Event: ${event}`, {
        hasSession: !!session,
        sessionExpiresAt: session?.expires_at,
        userId: session?.user?.id
      });
    }
  }
}; 