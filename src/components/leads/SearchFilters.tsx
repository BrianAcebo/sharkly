import { useState, useEffect } from 'react';
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
import { FILTER_OPTIONS } from '../../utils/constants';

interface Filters {
	status: string;
	priority: string;
	stage: string;
	dateRange?: { from?: Date; to?: Date };
}

interface SearchFiltersProps {
	filters: Filters;
	onFiltersChange: (filters: Filters) => void;
	totalResults?: number;
}

export function SearchFilters({ filters, onFiltersChange, totalResults = 0 }: SearchFiltersProps) {
	const [showFilters, setShowFilters] = useState<boolean>(false);
	const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

	// Local, unapplied working copy for the Advanced Filters dialog
	const [localFilters, setLocalFilters] = useState<Filters>(filters);

	// When opening the panel, sync local state with current applied filters
	useEffect(() => {
		if (showFilters) {
			setLocalFilters(filters);
			setDateRange(filters.dateRange || {});
		}
	}, [showFilters, filters]);

	const handleStatusChange = (value: string) => {
		setLocalFilters((prev) => ({ ...prev, status: value }));
	};

	const handlePriorityChange = (value: string) => {
		setLocalFilters((prev) => ({ ...prev, priority: value }));
	};

	const handleStageChange = (value: string) => {
		setLocalFilters((prev) => ({ ...prev, stage: value }));
	};

	const applyFilters = () => {
		onFiltersChange({ ...localFilters, dateRange });
		setShowFilters(false);
	};

	const clearFilters = () => {
		const cleared: Filters = { status: 'all', priority: 'all', stage: 'all', dateRange: undefined };
		setLocalFilters(cleared);
		setDateRange({});
		onFiltersChange(cleared);
	};

	// Count active filters for badge and summary
	const activeFilterCount = [
		filters.status !== 'all',
		filters.priority !== 'all',
		filters.stage !== 'all',
		filters.dateRange?.from || filters.dateRange?.to
	].filter(Boolean).length;

	type Select = {
		name: string;
		options: SelectOption[];
	};

	type SelectOption = {
		value: string;
		label: string;
	} | Readonly<{ value: string; label: string }>;

	const renderSelect = (
		select: Select,
		placeholder: string,
		onValueChange: (value: string) => void
	) => {
		return (
			<Select
				value={localFilters[select.name as keyof Filters] as string}
				onValueChange={onValueChange}
			>
				<SelectTrigger className="h-9 w-[180px] border border-gray-200 bg-white shadow-sm dark:border-gray-900 dark:bg-white/[0.03]">
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent className="cursor-pointer bg-white text-gray-700 ring-1 ring-gray-300 ring-inset dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-700">
					{select.options.map((option: SelectOption, i: number) => (
						<SelectItem
							key={`${(option as { value: string }).value}-${i}`}
							className="cursor-pointer"
							value={(option as { value: string }).value}
						>
							{(option as { label: string }).label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	};

	const statusOptions: Select = {
		name: 'status',
		options: FILTER_OPTIONS.STATUS as unknown as SelectOption[]
	};

	const priorityOptions: Select = {
		name: 'priority',
		options: FILTER_OPTIONS.PRIORITY as unknown as SelectOption[]
	};

	const stageOptions: Select = {
		name: 'stage',
		options: FILTER_OPTIONS.STAGE as unknown as SelectOption[]
	};

	return (
		<div className="space-y-4">
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

				{activeFilterCount > 0 && (
					<span className="text-sm text-gray-600 dark:text-gray-400">
						{totalResults} result{totalResults !== 1 ? 's' : ''} found
					</span>
				)}
			</div>

			{/* Applied filters summary */}
			{activeFilterCount > 0 && (
				<div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
					{filters.status !== 'all' && <Badge variant="secondary">Status: {filters.status}</Badge>}
					{filters.priority !== 'all' && <Badge variant="secondary">Priority: {filters.priority}</Badge>}
					{filters.stage !== 'all' && <Badge variant="secondary">Stage: {filters.stage}</Badge>}
					{(filters.dateRange?.from || filters.dateRange?.to) && (
						<Badge variant="secondary">
							Date: {filters.dateRange?.from ? format(filters.dateRange.from, 'LLL dd, y') : '...'}
							{filters.dateRange?.to ? ` - ${format(filters.dateRange.to, 'LLL dd, y')}` : ''}
						</Badge>
					)}
				</div>
			)}

			{showFilters && (
				<div className="animate-in slide-in-from-top-2 flex flex-wrap gap-10 rounded-lg bg-white p-4 text-gray-700 ring-1 ring-gray-300 duration-200 ring-inset dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-700">
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
											setLocalFilters((prev) => ({ ...prev, dateRange: { from: dates[0], to: dates[1] } }));
										}
									}}
								/>
							</PopoverContent>
						</Popover>
					</div>

					<div className="w-full flex flex-col sm:flex-row justify-end gap-2 mt-4">
						<Button variant="ghost" onClick={() => { setShowFilters(false); setLocalFilters(filters); setDateRange(filters.dateRange || {}); }}>Cancel</Button>
						<Button onClick={applyFilters}>Save</Button>
					</div>
				</div>
			)}
		</div>
	);
}
