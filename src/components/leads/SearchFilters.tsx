import { useState } from 'react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Button as Button2 } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, Filter, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import DatePicker from '../form/date-picker';

interface Filters {
	status: string;
	priority: string;
	stage: string;
}

interface SearchFiltersProps {
	filters: Filters;
	onFiltersChange: (filters: Filters) => void;
	totalResults?: number;
}

export function SearchFilters({ filters, onFiltersChange, totalResults = 0 }: SearchFiltersProps) {
	const [showFilters, setShowFilters] = useState<boolean>(false);
	const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

	const handleStatusChange = (value: string) => {
		onFiltersChange({
			...filters,
			status: value
		});
	};

	const handlePriorityChange = (value: string) => {
		onFiltersChange({
			...filters,
			priority: value
		});
	};

	const handleStageChange = (value: string) => {
		onFiltersChange({
			...filters,
			stage: value
		});
	};

	const clearFilters = () => {
		onFiltersChange({
			status: 'all',
			priority: 'all',
			stage: 'all'
		});
		setDateRange({});
	};

	// Count active filters
	const activeFilterCount = [
		filters.status !== 'all',
		filters.priority !== 'all',
		filters.stage !== 'all',
		dateRange.from || dateRange.to
	].filter(Boolean).length;

	type Select = {
		name: string;
		options: SelectOption[];
	};

	type SelectOption = {
		value: string;
		label: string;
	};

	const renderSelect = (
		select: Select,
		placeholder: string,
		onValueChange: (value: string) => void
	) => {
		return (
			<Select
				value={filters[select.name as keyof Filters] as string}
				onValueChange={onValueChange}
			>
				<SelectTrigger className="h-9 w-[180px] border border-gray-200 bg-white shadow-sm dark:border-gray-900 dark:bg-white/[0.03]">
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent className="cursor-pointer bg-white text-gray-700 ring-1 ring-gray-300 ring-inset dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-700">
					{select.options.map((option: SelectOption, i: number) => (
						<SelectItem
							key={option.value + '-' + i}
							className="cursor-pointer"
							value={option.value}
						>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	};

	const statusOptions: Select = {
		name: 'status',
		options: [
			{
				value: 'all',
				label: 'All statuses'
			},
			{
				value: 'active',
				label: 'Active'
			},
			{
				value: 'in_progress',
				label: 'In progress'
			},
			{
				value: 'closed',
				label: 'Closed'
			}
		]
	};

	const priorityOptions: Select = {
		name: 'priority',
		options: [
			{
				value: 'all',
				label: 'All priority levels'
			},
			{
				value: 'low',
				label: 'Low'
			},
			{
				value: 'medium',
				label: 'Medium'
			},
			{
				value: 'high',
				label: 'High'
			},
			{
				value: 'critical',
				label: 'Critical'
			}
		]
	};

	const stageOptions: Select = {
		name: 'stage',
		options: [
			{
				value: 'all',
				label: 'All stages'
			},
			{
				value: 'new',
				label: 'New Lead'
			},
			{
				value: 'contacted',
				label: 'Contacted'
			},
			{
				value: 'qualified',
				label: 'Qualified'
			},
			{
				value: 'proposal',
				label: 'Proposal'
			},
			{
				value: 'closed-won',
				label: 'Closed Won'
			},
			{
				value: 'closed-lost',
				label: 'Closed Lost'
			}
		]
	};

	return (
		<div className="mb-6 space-y-4">
			<div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-4">
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowFilters(!showFilters)}
						className="h-9"
					>
						<Filter className="mr-2 h-4 w-4" />
						Filters
						{activeFilterCount > 0 && (
							<Badge
								variant="secondary"
								className="ml-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
							>
								{activeFilterCount}
							</Badge>
						)}
					</Button>

					{activeFilterCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							onClick={clearFilters}
							className="h-9"
						>
							<X className="mr-2 h-4 w-4" />
							Clear
						</Button>
					)}
				</div>

				<p className="text-sm">
					{totalResults} result{totalResults !== 1 ? 's' : ''} found
				</p>
			</div>

			{showFilters && (
				<div className="animate-in slide-in-from-top-2 flex gap-10 rounded-lg bg-white p-4 text-gray-700 ring-1 ring-gray-300 duration-200 ring-inset dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-700">
					<div className="space-y-4">
						<label className="mb-3 block text-sm font-medium">Status</label>
						{renderSelect(statusOptions, 'Select status', handleStatusChange)}
					</div>

					<div className="space-y-4">
						<label className="mb-3 block text-sm font-medium">Priority Level</label>
						{renderSelect(priorityOptions, 'Select priority level', handlePriorityChange)}
					</div>

					<div className="space-y-4">
						<label className="mb-3 block text-sm font-medium">Stage</label>
						{renderSelect(stageOptions, 'Select stage', handleStageChange)}
					</div>

					<div className="space-y-4">
						<label className="mb-3 block text-sm font-medium">Date Range</label>
						<Popover>
							<PopoverTrigger asChild>
								<Button2
									variant="outline"
									size="sm"
									className="border-gray-300 font-normal dark:border-gray-700 dark:text-gray-400"
								>
									<CalendarIcon className="mr-2 h-4 w-4" />
									{dateRange.from ? (
										dateRange.to ? (
											<>
												{format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
											</>
										) : (
											format(dateRange.from, 'LLL dd, y')
										)
									) : (
										'Select date range'
									)}
								</Button2>
							</PopoverTrigger>
							<PopoverContent
								className="w-auto border-none bg-white p-3 text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
								align="start"
							>
								<DatePicker
									id="date-picker"
									label="Date Range"
									placeholder="Select a date"
									mode="range"
									onChange={(dates: Date[]) => {
										if (dates && dates.length === 2) {
											setDateRange({ from: dates[0], to: dates[1] });
										}
									}}
								/>
							</PopoverContent>
						</Popover>
					</div>
				</div>
			)}
		</div>
	);
}
