import React from 'react';

interface PageHeaderProps {
	title: string;
	subtitle?: string;
	breadcrumb?: React.ReactNode;
	rightContent?: React.ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumb, rightContent }: PageHeaderProps) {
	return (
		<div className="relative flex items-center justify-between rounded-lg border border-gray-200 bg-white px-8 py-5 dark:border-gray-700 dark:bg-gray-900">
			<div>
				{breadcrumb && (
					<div className="mb-2 text-xs text-gray-500 dark:text-gray-400">{breadcrumb}</div>
				)}
				<h1 className="font-montserrat max-w-2xl text-[22px] font-bold text-gray-900 dark:text-white">
					{title}
				</h1>
				{subtitle && (
					<p className="mt-1 text-[13px] text-gray-600 dark:text-gray-400">{subtitle}</p>
				)}
			</div>
			{rightContent && (
				<div className="absolute top-1/2 right-8 flex -translate-y-1/2 items-center gap-2">
					{rightContent}
				</div>
			)}
		</div>
	);
}
