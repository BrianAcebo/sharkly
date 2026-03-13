import React from 'react';
import { Link } from 'react-router';

const CTA: React.FC = () => {
	return (
		<section className="border-t border-gray-800 bg-black py-20 text-center md:py-24 dark:bg-gray-900">
			<div className="mx-auto max-w-[600px] px-4 sm:px-6">
				<h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Ready to rank?</h2>
				<p className="mb-8 text-lg text-white/80">
					Join small business owners who are building real SEO strategies — without the guesswork.
				</p>
				<Link
					to="/signup"
					className="inline-block rounded-xl bg-white px-9 py-3.5 text-base font-semibold text-black transition-colors hover:bg-gray-100 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
				>
					Get started free
				</Link>
			</div>
		</section>
	);
};

export default CTA;
