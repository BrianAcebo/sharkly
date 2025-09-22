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
			<PageMeta title="Automate Outreach & Pre-Qualify Leads With AI | Paperboat CRM" description="Paperboat CRM is an AI sales assistant that automates outreach, chats with leads, and pre-qualifies prospects to help your teams close more deals faster." />
			
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
