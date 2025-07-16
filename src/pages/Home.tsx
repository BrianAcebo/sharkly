import CTA from '../components/home/CTA';
import Demo from '../components/home/Demo';
import Features from '../components/home/Features';
import Hero from '../components/home/Hero';
import Testimonials from '../components/home/Testimonials';
import { useEffect, useState } from 'react';

const Home = () => {
	const [isLoading, setIsLoading] = useState(true);
	useEffect(() => {
		setIsLoading(false);
	}, []);

	return (
		<>
			<Hero isLoading={isLoading} />
			<Features />
			<Demo />
			<Testimonials />
			<CTA />
		</>
	);
};

export default Home;
