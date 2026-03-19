import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import useAuth from '../hooks/useAuth';
import { getMarketingUrl } from '../utils/urls';

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
