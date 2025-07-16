import { Link } from 'react-router';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Fragment } from 'react/jsx-runtime';

interface BreadcrumbProps {
	pageTitle: string;
	returnTo?: string;
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ pageTitle, returnTo }) => {
	const location = useLocation();
	const currentPath = location.pathname;

	const breadcrumbs = currentPath
		.split('/')
		.filter(Boolean)
		.map((path) => ({
			label: path,
			href: `/${path}`
		}));

	// Old path: new path
	const redirects: Record<string, string> = {};

	return (
		<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
			<div className="flex items-center gap-3">
				{returnTo && (
					<a href={returnTo}>
						<ArrowLeft className="h-4 w-4" />
					</a>
				)}
				<h2 className="text-xl font-semibold text-gray-800 dark:text-white/90" x-text="pageName">
					{pageTitle}
				</h2>
			</div>
			<nav>
				<ul className="flex items-center gap-1.5">
					{breadcrumbs.map((breadcrumb, index) => (
						<Fragment key={`${breadcrumb.label}-${index}`}>
							{index !== breadcrumbs.length - 1 && (
								<li>
									<Link
										to={redirects[breadcrumb.href] || breadcrumb.href}
										className="inline-flex items-center gap-1.5 text-sm text-gray-500 capitalize dark:text-gray-400"
									>
										{redirects[breadcrumb.label] || breadcrumb.label}
										<ChevronRight className="h-4 w-4 stroke-current" />
									</Link>
								</li>
							)}
						</Fragment>
					))}
					<li className="text-sm text-gray-800 dark:text-white/90">{pageTitle}</li>
				</ul>
			</nav>
		</div>
	);
};

export default PageBreadcrumb;
