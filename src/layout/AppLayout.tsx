import React from 'react';
import AppHeader from '../components/header/AppHeader';
import AppSidebar from '../components/header/AppSidebar';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useSidebar } from '../hooks/useSidebar';
import { BreadcrumbsProvider } from '../providers/BreadcrumbsProvider';
import { SidebarProvider } from '../providers/SidebarProvider';
import { useAuth } from '../hooks/useAuth';
import { AuthLoadingState } from '../contexts/AuthContext';
import { AuthLoading } from '../components/AuthLoading';
import { authDebug } from '../utils/authDebug';

const LayoutContent: React.FC = () => {
    const { pathname } = useLocation();
	const { isExpanded } = useSidebar();
	const { user, loadingState, session } = useAuth();

	// Debug logging
	authDebug.logUserState(user, session);

	// Show loading while auth is being checked
	if (loadingState === AuthLoadingState.LOADING) {
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	// Simple redirects without state
	if (!session || !user?.id) {
		return <Navigate to="/" replace />;
	}

	// Wait for user profile data to be fully loaded before making routing decisions
	// This prevents redirects when user data is incomplete
	if (!user?.first_name || !user?.last_name) {
		authDebug.log('User profile data not fully loaded, showing loading...');
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	authDebug.log('AppLayout - user:', user);
	authDebug.log('AppLayout - completed_onboarding:', user?.completed_onboarding);
	authDebug.log('AppLayout - pathname:', pathname);

	if (!user?.completed_onboarding && pathname !== '/onboarding') {
		console.log('AppLayout - Redirecting to onboarding');
		return <Navigate to="/onboarding" replace />;
	}

	if (user?.completed_onboarding && pathname === '/onboarding') {
		console.log('AppLayout - Redirecting to pipeline');
		return <Navigate to="/pipeline" replace />;
	}

	console.log('AppLayout - organization_id:', user?.organization_id);
	console.log('AppLayout - pathname:', pathname);

	// Only redirect to organization-required if we're sure the user has no organization
	// and we're not already on that page
	if (user?.organization_id === '' && pathname !== '/organization-required') {
		console.log('AppLayout - Redirecting to organization-required');
		return <Navigate to="/organization-required" replace />;
	}

	// Only redirect away from organization-required if we have an organization
	if (user?.organization_id && user.organization_id !== '' && pathname === '/organization-required') {
		console.log('AppLayout - Redirecting to pipeline from organization-required');
		return <Navigate to="/pipeline" replace />;
	}

	return (
		<div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            {isExpanded && (
                <AppSidebar />
            )}
            
            <div className="flex-1 h-screen overflow-hidden">
                <AppHeader />
                
                <div className="flex-1">
                    <main className="h-screen-visible overflow-y-auto mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
	);
};

const AppLayout: React.FC = () => {
	return (
		<SidebarProvider>
            <BreadcrumbsProvider>
			    <LayoutContent />
            </BreadcrumbsProvider>
		</SidebarProvider>
	);
};

export default AppLayout;
