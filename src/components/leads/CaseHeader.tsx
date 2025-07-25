import React from 'react';
import { FileText, Clock, AlertTriangle, Shield } from 'lucide-react';
import type { Case } from '../../types/case';
import ComponentCard from '../common/ComponentCard';

interface CaseHeaderProps {
	caseData: Case;
}

const CaseHeader: React.FC<CaseHeaderProps> = ({ caseData }) => {
	const getStatusColor = (status: string) => {
		switch (status) {
			case 'active':
				return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900';
			case 'in_progress':
				return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900';
			case 'closed':
				return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900';
			default:
				return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900';
		}
	};

	const getPriorityColor = (status: string) => {
		switch (status) {
			case 'low':
				return 'border-none text-green-700 dark:text-green-400';
			case 'medium':
				return 'border-none text-amber-700 dark:text-amber-400';
			case 'high':
				return 'border-none text-red-700 dark:text-red-400';
			case 'critical':
				return 'border-none text-red-900 dark:text-red-600';
		}
	};

	const formatDate = (date: Date) => {
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	};

	return (
		<ComponentCard className="mb-6 rounded-xl border border-slate-200 bg-white">
			<div className="mb-4 flex flex-col items-start justify-between gap-5 md:flex-row">
				<div className="flex items-center space-x-3">
					<div className="rounded-lg border border-gray-200 bg-gray-100 p-2 dark:border-gray-900 dark:bg-gray-900">
						<FileText className="h-6 w-6 text-current" />
					</div>
					<div>
						<h1 className="text-2xl font-bold">{caseData.title}</h1>
						<p className="text-sm">Case ID: {caseData.id}</p>
					</div>
				</div>

				<div className="flex items-center space-x-3">
					<span
						className={`rounded-full border px-3 py-1 text-sm capitalize ${getStatusColor(caseData.status)}`}
					>
						{caseData.status.replace('in_progress', 'In Progress')}
					</span>
					<span
						className={`rounded-full px-3 py-1 text-sm capitalize ${getPriorityColor(caseData.priority)}`}
					>
						Priority: {caseData.priority}
					</span>
				</div>
			</div>

			<p className="mb-4">{caseData.description}</p>

			<div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
				<div className="flex items-center space-x-2">
					<Shield className="h-4 w-4" />
					<span className="font-medium">Category:</span>
					<span>{caseData.category}</span>
				</div>

				<div className="flex items-center space-x-2">
					<Clock className="h-4 w-4" />
					<span className="font-medium">Created:</span>
					<span>{formatDate(caseData.createdAt)}</span>
				</div>

				<div className="flex items-center space-x-2">
					<AlertTriangle className="h-4 w-4" />
					<span className="font-medium">Updated:</span>
					<span>{formatDate(caseData.updatedAt)}</span>
				</div>
			</div>

			{caseData.tags.length > 0 && (
				<div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-900">
					<div className="flex items-center space-x-2">
						<span className="text-sm font-medium">Tags:</span>
						<div className="flex flex-wrap gap-2">
							{caseData.tags.map((tag, index) => (
								<span
									key={`${tag}-${index}`}
									className="rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900/20 dark:text-gray-400"
								>
									#{tag}
								</span>
							))}
						</div>
					</div>
				</div>
			)}
		</ComponentCard>
	);
};

export default CaseHeader;
