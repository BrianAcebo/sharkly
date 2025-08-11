import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';

export default function OAuthCallback() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [error, setError] = useState<string | null>(null);

	const handleCallback = useCallback(async () => {
		try {
			setError(null);
			
			const { error: authError } = await supabase.auth.getSession();

			if (authError) {
				throw authError;
			}

			// Get the intended destination from the URL or default to home
			const next = searchParams.get('next') ?? '/';
			navigate(next);
		} catch (err) {
			console.error('Error in OAuth callback:', err);
			const errorMessage = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
			setError(errorMessage);
		}
	}, [searchParams, navigate]);

	const handleRetry = () => {
		handleCallback();
	};

	useEffect(() => {
		handleCallback();
	}, [handleCallback]);

	if (error) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
					<div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900 rounded-full mb-4">
						<AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
					</div>
					
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
						Authentication Error
					</h2>
					
					<p className="text-gray-600 dark:text-gray-400 text-center mb-6">
						{error}
					</p>

					<div className="flex space-x-3">
						<Button
							onClick={handleRetry}
							className="flex-1"
							variant="outline"
						>
							<RefreshCw className="h-4 w-4 mr-2" />
							Try Again
						</Button>
						
						<Button
							onClick={() => navigate('/')}
							className="flex-1"
						>
							Go Home
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<h1 className="mb-4 text-2xl font-semibold">Processing authentication...</h1>
				<div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
			</div>
		</div>
	);
}
