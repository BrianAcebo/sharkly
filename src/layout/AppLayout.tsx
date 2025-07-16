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

const LayoutContent: React.FC = () => {
    const { pathname } = useLocation();
	const { isExpanded } = useSidebar();
	const { user, loadingState, session } = useAuth();
	const searchParams = new URLSearchParams(window.location.search);
	const next = searchParams.get('next');

	// Show loading state while auth is being checked
	if (loadingState === AuthLoadingState.LOADING) {
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	// If not authenticated, redirect to home
	if (!session || !user?.id) {
		return <Navigate to="/" replace />;
	}

	// If onboarding is not completed and trying to access a protected route
	if (!user?.completed_onboarding && pathname !== '/onboarding') {
		return <Navigate to={`/onboarding${next ? '?next=' + next : ''}`} replace />;
	}

	// If user is onboarded and on the organization required page, redirect to cases
	if (user?.completed_onboarding && pathname === '/onboarding') {
		return <Navigate to="/pipeline" />;
	}

	return (
		<div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-black">
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
