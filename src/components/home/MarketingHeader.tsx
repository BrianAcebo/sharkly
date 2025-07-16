import React from 'react';
import { Menu } from 'lucide-react';
import { ThemeToggleButton } from '../common/ThemeToggleButton';
import { Link } from 'react-router';

const Header: React.FC = () => {
	return (
		<header className="fixed top-0 right-0 left-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					{/* Logo */}
					<div className="flex items-center space-x-3">
						<Link to="/" className="block">
							<img
								className="block dark:hidden"
								width={75}
								height="auto"
								src="/images/logos/logo.svg"
								alt="Logo"
							/>
							<img
								className="hidden dark:block"
								width={75}
								height="auto"
								src="/images/logos/logo-dark.svg"
								alt="Logo"
							/>
						</Link>
					</div>

					{/* Desktop Navigation */}
					<nav className="hidden items-center space-x-8 md:flex">
						<a
							href="#features"
							className="hover:text-brand-500 dark:hover:text-brand-400 text-gray-700 transition-colors dark:text-gray-300"
						>
							Features
						</a>
						<a
							href="#demo"
							className="hover:text-brand-500 dark:hover:text-brand-400 text-gray-700 transition-colors dark:text-gray-300"
						>
							Demo
						</a>
						<a
							href="#testimonials"
							className="hover:text-brand-500 dark:hover:text-brand-400 text-gray-700 transition-colors dark:text-gray-300"
						>
							Testimonials
						</a>
						<a
							href="#contact"
							className="hover:text-brand-500 dark:hover:text-brand-400 text-gray-700 transition-colors dark:text-gray-300"
						>
							Contact
						</a>
					</nav>

					{/* Right Side */}
					<div className="flex items-center space-x-4">
						<ThemeToggleButton />
						<Link to="/signup">
							<button className="bg-brand-500 hover:bg-brand-600 hidden items-center rounded-lg px-4 py-2 font-medium text-white transition-colors md:inline-flex">
								Get Started
							</button>
						</Link>
						<button className="rounded-lg p-2 hover:bg-gray-100 md:hidden dark:hover:bg-gray-800">
							<Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
						</button>
					</div>
				</div>
			</div>
		</header>
	);
};

export default Header;
