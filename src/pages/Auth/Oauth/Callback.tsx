import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';

export default function OAuthCallback() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	useEffect(() => {
		const handleCallback = async () => {
			try {
				const { error } = await supabase.auth.getSession();

				if (error) {
					throw error;
				}

				// Get the intended destination from the URL or default to home
				const next = searchParams.get('next') ?? '/';
				navigate(next);
			} catch (error) {
				console.error('Error in OAuth callback:', error);
				navigate('/auth/auth-code-error');
			}
		};

		handleCallback();
	}, [navigate, searchParams]);

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<h1 className="mb-4 text-2xl font-semibold">Processing authentication...</h1>
				<div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
			</div>
		</div>
	);
}
