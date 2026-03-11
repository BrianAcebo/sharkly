import React from 'react';
import { Link } from 'react-router';

interface HeroProps {
	isLoading?: boolean;
}

const heroImages = [
	{ src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600', alt: 'Team collaboration', rotate: '1deg' },
	{ src: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=600', alt: 'Person at computer', rotate: '-2deg' },
	{ src: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600', alt: 'Content creation', rotate: '6deg' },
	{ src: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600', alt: 'Business meeting', rotate: '-3deg' },
	{ src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600', alt: 'Analytics dashboard', rotate: '1deg' },
];

const Hero: React.FC<HeroProps> = ({ isLoading = false }) => {
	if (isLoading) {
		return (
			<section className="relative overflow-hidden bg-[#f5f3ed] dark:bg-gray-950 pt-32 pb-16 min-h-[80vh] flex flex-col justify-center">
				<div className="mx-auto max-w-[1200px] w-full px-4 sm:px-6">
					<div className="animate-pulse space-y-4">
						<div className="h-12 w-3/4 bg-gray-300 dark:bg-gray-700 rounded" />
						<div className="h-6 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
						<div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="relative overflow-hidden bg-[#f5f3ed] dark:bg-gray-950 pt-32 pb-24 min-h-[100vh] flex flex-col justify-center">
			<div className="mx-auto max-w-[1200px] w-full px-4 sm:px-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center mb-16">
					<div>
						<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black dark:text-white leading-tight tracking-tight mb-6">
							SEO platform that helps you rank better, faster.
						</h1>
						<p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
							Build your strategy, find winning keywords, and publish content that ranks — automatically.
							Cut weeks off your SEO process.
						</p>
						<Link
							to="/signup"
							className="inline-flex items-center gap-3 bg-black dark:bg-white text-white dark:text-black px-6 py-3.5 rounded-xl font-medium text-base hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
						>
							<span>Get started</span>
							<span className="text-lg">→</span>
						</Link>
					</div>
					{/* Polaroid-style images */}
					<div className="relative h-[400px] min-h-[300px] hidden md:block">
						{heroImages.map((img, i) => (
							<div
								key={i}
								className="absolute overflow-hidden rounded-lg shadow-xl"
								style={{
									width: '45%',
									aspectRatio: '3/4',
									top: `${10 + i * 15}%`,
									left: `${5 + i * 18}%`,
									transform: `translate(-50%, -50%) rotate(${img.rotate})`,
									zIndex: i,
								}}
							>
								<img src={img.src} alt={img.alt} loading="lazy" className="w-full h-full object-cover" />
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
};

export default Hero;
