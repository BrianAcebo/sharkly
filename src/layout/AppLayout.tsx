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

const LayoutContent: React.FC = () => {
    const { pathname } = useLocation();
	const { isExpanded } = useSidebar();
	const { user, loadingState, session } = useAuth();
	const searchParams = new URLSearchParams(window.location.search);
	const next = searchParams.get('next');
	const [lastRedirect, setLastRedirect] = useState<string | null>(null);

	console.log('AppLayout - loadingState:', loadingState);
	console.log('AppLayout - session:', !!session);
	console.log('AppLayout - user:', !!user);
	console.log('AppLayout - pathname:', pathname);
	console.log('AppLayout - user organization_id:', user?.organization_id);
	console.log('AppLayout - user completed_onboarding:', user?.completed_onboarding);

	// Show loading while auth is being checked
	if (loadingState === AuthLoadingState.LOADING) {
		console.log('AppLayout - Still loading, showing loading screen');
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	// If not authenticated, redirect to home
	if (!session || !user?.id) {
		const redirectPath = '/';
		if (lastRedirect !== redirectPath) {
			console.log('AppLayout - Not authenticated, redirecting to home');
			setLastRedirect(redirectPath);
			return <Navigate to={redirectPath} replace />;
		}
	}

	// If onboarding is not completed and trying to access a protected route
	if (!user?.completed_onboarding && pathname !== '/onboarding') {
		const redirectPath = `/onboarding${next ? '?next=' + next : ''}`;
		if (lastRedirect !== redirectPath) {
			console.log('AppLayout - Onboarding not completed, redirecting to onboarding');
			setLastRedirect(redirectPath);
			return <Navigate to={redirectPath} replace />;
		}
	}

	// If user is onboarded and on the onboarding page, redirect to pipeline
	if (user?.completed_onboarding && pathname === '/onboarding') {
		const redirectPath = '/pipeline';
		if (lastRedirect !== redirectPath) {
			console.log('AppLayout - User completed onboarding, redirecting to pipeline');
			setLastRedirect(redirectPath);
			return <Navigate to={redirectPath} />;
		}
	}

	// If no organization and trying to access a protected route
	if ((!user?.organization_id || user.organization_id === '') && pathname !== '/organization-required') {
		const redirectPath = '/organization-required';
		if (lastRedirect !== redirectPath) {
			console.log('AppLayout - No organization, redirecting to organization-required');
			setLastRedirect(redirectPath);
			return <Navigate to={redirectPath} replace />;
		}
	}

	// If user has organization and on the organization required page, redirect to pipeline
	if (user?.organization_id && user.organization_id !== '' && pathname === '/organization-required') {
		const redirectPath = '/pipeline';
		if (lastRedirect !== redirectPath) {
			console.log('AppLayout - User has organization, redirecting to pipeline');
			setLastRedirect(redirectPath);
			return <Navigate to={redirectPath} replace />;
		}
	}

	// Temporary fix: if user has completed onboarding and is on organization-required, redirect to pipeline
	if (user?.completed_onboarding && pathname === '/organization-required') {
		const redirectPath = '/pipeline';
		if (lastRedirect !== redirectPath) {
			console.log('AppLayout - User completed onboarding, redirecting to pipeline (temp fix)');
			setLastRedirect(redirectPath);
			return <Navigate to={redirectPath} replace />;
		}
	}

	// Clear last redirect if we're rendering normally
	if (lastRedirect) {
		setLastRedirect(null);
	}

	console.log('AppLayout - Rendering main layout');

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
