import PageMeta from '../components/common/PageMeta';
import CTA from '../components/home/CTA';
import Comparison from '../components/home/Comparison';
import Features from '../components/home/Features';
import Hero from '../components/home/Hero';
import Pricing from '../components/home/Pricing';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import useAuth from '../hooks/useAuth';
import ThemeTogglerTwo from '../components/common/ThemeTogglerTwo';

const Home = () => {
	const [isLoading, setIsLoading] = useState(true);
	const { session } = useAuth();

	useEffect(() => {
		setIsLoading(false);
	}, []);

	if (session && !isLoading) {
		return <Navigate to="/dashboard" replace />;
	}

	return (
		<>
			<PageMeta
				title="AI-Powered SEO for Non-SEO People | Sharkly"
				description="Build your SEO strategy, generate optimized content, and track your rankings without becoming an SEO expert."
			/>

			<Hero isLoading={isLoading} />
			<Features />
			<Comparison />
			<Pricing />
			<CTA />
			<div className="fixed right-6 bottom-6 z-50 hidden sm:block">
				<ThemeTogglerTwo />
			</div>
		</>
	);
};

export default Home;
