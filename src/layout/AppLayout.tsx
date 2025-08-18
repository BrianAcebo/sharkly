import React, { useState } from 'react';
import AppHeader from '../components/header/AppHeader';
import AppSidebar from '../components/header/AppSidebar';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useSidebar } from '../hooks/useSidebar';
import { BreadcrumbsProvider } from '../providers/BreadcrumbsProvider';
import { SidebarProvider } from '../providers/SidebarProvider';
import { useAuth } from '../hooks/useAuth';
import { AuthLoadingState } from '../contexts/AuthContext';
import { AuthLoading } from '../components/AuthLoading';
import { useScreenSize } from '../hooks/useScreenSize';
import ScreenSizeWarning from '../components/common/ScreenSizeWarning';
import { useNotifications } from '../hooks/useNotifications';

const LayoutContent: React.FC = () => {
    const { pathname } = useLocation();
	const { isExpanded } = useSidebar();
	const { user, loadingState, session } = useAuth();
	const [hasCheckedOrg, setHasCheckedOrg] = useState(false);
	const { isScreenTooSmall } = useScreenSize();
	
	// Initialize notifications system
	useNotifications(session?.user?.id);

	// Show loading while auth is being checked
	if (loadingState === AuthLoadingState.LOADING) {
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	// Show loading while user profile is being loaded (prevents race condition)
	if (session && !user?.id) {
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	// Simple redirects without state
	if (!session || !user?.id) {
		return <Navigate to="/" replace />;
	}

	// For newly created users, prioritize onboarding over organization check
	if (!user?.completed_onboarding && pathname !== '/onboarding') {
		return <Navigate to="/onboarding" replace />;
	}

	// Only after onboarding is complete, check organization status
	if (user?.completed_onboarding) {
		// Add a small delay to allow user context to update after invitation completion
		// This prevents race conditions where organization_id might not be immediately available
		if (!hasCheckedOrg) {
			setTimeout(() => setHasCheckedOrg(true), 100);
			return <AuthLoading state={AuthLoadingState.LOADING} />;
		}

		// If user has no organization after completing onboarding, redirect to organization-required
		if (!user?.organization_id && pathname !== '/organization-required') {
			return <Navigate to="/organization-required" replace />;
		}

		// If user has organization and is on organization-required, redirect to pipeline
		if (user?.organization_id && pathname === '/organization-required') {
			return <Navigate to="/pipeline" replace />;
		}

		// If user has organization and is on onboarding, redirect to pipeline
		if (user?.organization_id && pathname === '/onboarding') {
			return <Navigate to="/pipeline" replace />;
		}
	}

	// Safety fallback: if we're on organization-required but user has organization, redirect to pipeline
	if (pathname === '/organization-required' && user?.organization_id) {
		return <Navigate to="/pipeline" replace />;
	}

	// Safety fallback: if we're on onboarding but user completed it, redirect to pipeline
	if (pathname === '/onboarding' && user?.completed_onboarding) {
		return <Navigate to="/pipeline" replace />;
	}

	// Show screen size warning if screen is too small
	if (isScreenTooSmall) {
		return <ScreenSizeWarning />;
	}

	return (
		<div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 app-layout-content">
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
