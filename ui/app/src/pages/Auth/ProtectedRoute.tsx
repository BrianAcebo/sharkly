import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

	useEffect(() => {
		const checkAuth = async () => {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			setIsAuthenticated(!!session);
		};

		checkAuth();

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_, session) => {
			setIsAuthenticated(!!session);
		});

		return () => subscription.unsubscribe();
	}, []);

	if (isAuthenticated === null) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-900">
				<p className="text-white">Loading...</p>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/" replace />;
	}

	return <>{children}</>;
}
