import PageMeta from '../components/common/PageMeta';
import CTA from '../components/home/CTA';
import Demo from '../components/home/Demo';
import Features from '../components/home/Features';
import Hero from '../components/home/Hero';
import Pricing from '../components/home/Pricing';
import Testimonials from '../components/home/Testimonials';
import { useEffect, useState } from 'react';

const Home = () => {
	const [isLoading, setIsLoading] = useState(true);
	useEffect(() => {
		setIsLoading(false);
	}, []);

	return (
		<>
            <PageMeta title="Uncover Digital Footprints Instantly | True Sight Intelligence" description="Map identities across the web, social media, and data breaches. Visualize OSINT graphs and track threats in real-time with our AI-powered OSINT assistant." />
			
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
