import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import useAuth from '../hooks/useAuth';

/** Marketing home URL: production sharkly.co or local dev :4321 */
function getMarketingUrl(): string {
	if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
		return 'http://localhost:4321';
	}
	return import.meta.env.VITE_MARKETING_URL ?? 'https://sharkly.co';
}

const Home = () => {
	const [isLoading, setIsLoading] = useState(true);
	const { session } = useAuth();

	useEffect(() => {
		setIsLoading(false);
	}, []);

	// Signed in → dashboard
	if (session && !isLoading) {
		return <Navigate to="/dashboard" replace />;
	}

	// Not signed in → redirect to marketing home
	if (!isLoading) {
		window.location.href = getMarketingUrl();
		return null; // Render nothing while redirecting
	}

	return null; // Brief loading state
};

export default Home;
