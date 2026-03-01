import PageMeta from '../components/common/PageMeta';
import CTA from '../components/home/CTA';
import Demo from '../components/home/Demo';
import Features from '../components/home/Features';
import Hero from '../components/home/Hero';
import Pricing from '../components/home/Pricing';
import Testimonials from '../components/home/Testimonials';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import useAuth from '../hooks/useAuth';

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
			<Pricing />
			<Demo />
			<Testimonials />
			<CTA />
		</>
	);
};

export default Home;
