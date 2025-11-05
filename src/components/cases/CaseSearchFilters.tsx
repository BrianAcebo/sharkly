import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Button as Button2 } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, Filter, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { SearchFilter } from '../../types/case';
import DatePicker from '../form/date-picker';
import { useCase } from '../../hooks/useCase';

export function CaseSearchFilters({ onManageClick }: { onManageClick?: () => void }) {
	const { filters, setFilters, results, dateRange, setDateRange } = useCase();
	const [showFilters, setShowFilters] = useState<boolean>(false);

	const handleStatusChange = (value: string) => {
		setFilters({
			...filters,
			status: value as 'active' | 'inactive' | 'in progress' | 'all'
		});
	};

	const handlePriorityLevelChange = (value: string) => {
		setFilters({
			...filters,
			priorityLevel: value as 'low' | 'medium' | 'high' | 'critical' | 'all'
		});
	};

	const handleSortChange = (value: string) => {
		setFilters({
			...filters,
			sortBy: value as 'recent' | 'priority' | 'alphabetical'
		});
	};

	const handleDateRangeChange = () => {
		setFilters({
			...filters,
			dateRange
		});
	};

	const clearFilters = () => {
		setFilters({
			status: 'all',
			priorityLevel: 'all',
			dateRange: { from: undefined, to: undefined },
			sortBy: 'recent',
            includeArchived: false
		});
		setDateRange({ from: undefined, to: undefined });
	};

	// Count active filters
    const activeFilterCount = [
		filters.status !== 'all',
		filters.priorityLevel !== 'all',
        filters.dateRange?.from || filters.dateRange?.to,
        filters.label && filters.label !== 'all'
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
				value={filters[select.name as keyof SearchFilter] as string}
				onValueChange={onValueChange}
			>
				<SelectTrigger className="h-9 w-[180px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent className="cursor-pointer bg-white text-gray-700 ring-1 ring-gray-300 ring-inset dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700">
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
            },
            {
                value: 'archived',
                label: 'Archived'
            }
		]
	};

	const sortOptions: Select = {
		name: 'sortBy',
		options: [
			{
				value: 'recent',
				label: 'Most Recent'
			},
			{
				value: 'priority',
				label: 'Priority Level'
			},
			{
				value: 'alphabetical',
				label: 'Alphabetical'
			}
		]
	};

	const priorityOptions: Select = {
		name: 'priorityLevel',
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

  const labelOptions: Select = {
    name: 'label',
    options: [
      { value: 'all', label: 'All labels' },
      { value: 'important', label: 'Important' }
    ]
  };

  const handleLabelChange = (value: string) => {
    setFilters({
      ...filters,
      label: value as 'all' | 'important'
    });
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

                    {renderSelect(sortOptions, 'Sort by', handleSortChange)}

					{onManageClick && (
						<Button variant="outline" size="sm" onClick={onManageClick} className="h-9">
							Manage Categories / Tags
						</Button>
					)}
				</div>

				<p className="text-sm">
					{results.total} result{results.total !== 1 ? 's' : ''} found
				</p>
			</div>

			{showFilters && (
                <div className="animate-in slide-in-from-top-2 flex gap-10 rounded-lg bg-white p-4 text-gray-700 ring-1 ring-gray-300 duration-200 ring-inset dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700">
					<div className="space-y-4">
						<label className="mb-3 block text-sm font-medium">Status</label>
						{renderSelect(statusOptions, 'Select status', handleStatusChange)}
					</div>

                    <div className="space-y-4">
						<label className="mb-3 block text-sm font-medium">Priority Level</label>
						{renderSelect(priorityOptions, 'Select priority level', handlePriorityLevelChange)}
					</div>

                    <div className="space-y-4">
                        <label className="mb-3 block text-sm font-medium">Label</label>
                        {renderSelect(labelOptions, 'Select label', handleLabelChange)}
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
								className="w-auto border-none bg-white p-3 text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
								align="start"
							>
								<DatePicker
									id="date-picker"
									label="Date Range"
									placeholder="Select a date"
									mode="range"
									onChange={(dates) => {
										if (dates.length) {
											setDateRange({
												from: dates[0],
												to: dates[1] || undefined
											});
										} else {
											setDateRange({ from: undefined, to: undefined });
										}
									}}
								/>
								<div className="flex items-center justify-between p-3">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											const resetDate = { from: undefined, to: undefined };
											setDateRange(resetDate);
											filters.dateRange = resetDate;
											handleDateRangeChange();
										}}
									>
										Clear
									</Button>
									<Button size="sm" onClick={handleDateRangeChange}>
										Apply
									</Button>
								</div>
							</PopoverContent>
						</Popover>
					</div>

					{activeFilterCount > 0 && (
						<div className="flex justify-end md:col-span-3">
							<Button variant="ghost" size="sm" onClick={clearFilters}>
								<X className="mr-2 h-4 w-4" />
								Clear all filters
							</Button>
						</div>
					)}
				</div>
			)}

			{activeFilterCount > 0 && (
				<div className="flex flex-wrap gap-2">
					{filters.status !== 'all' && (
						<Badge variant="secondary" className="flex items-center gap-1 text-sm capitalize">
							Status: {filters.status}
							<Button2
								variant="ghost"
								size="icon"
								className="ml-1 h-4 w-4 p-0"
								onClick={() => handleStatusChange('all')}
							>
								<X className="size-3" />
								<span className="sr-only">Remove status filter</span>
							</Button2>
						</Badge>
					)}

                    {filters.priorityLevel !== 'all' && (
						<Badge variant="secondary" className="flex items-center gap-1 text-sm capitalize">
							Priority Level: {filters.priorityLevel}
							<Button2
								variant="ghost"
								size="icon"
								className="ml-1 h-4 w-4 p-0"
								onClick={() => handlePriorityLevelChange('all')}
							>
								<X className="size-3" />
								<span className="sr-only">Remove priority filter</span>
							</Button2>
						</Badge>
					)}

                    {filters.label && filters.label !== 'all' && (
                        <Badge variant="secondary" className="flex items-center gap-1 text-sm capitalize">
                            Label: {filters.label}
                            <Button2
                                variant="ghost"
                                size="icon"
                                className="ml-1 h-4 w-4 p-0"
                                onClick={() => handleLabelChange('all')}
                            >
                                <X className="size-3" />
                                <span className="sr-only">Remove label filter</span>
                            </Button2>
                        </Badge>
                    )}

					{(filters.dateRange?.from || filters.dateRange?.to) && (
						<Badge variant="secondary" className="flex items-center gap-1">
							{filters.dateRange.from && filters.dateRange.to
								? `${format(filters.dateRange.from, 'LLL dd, y')} - ${format(filters.dateRange.to, 'LLL dd, y')}`
								: filters.dateRange.from
									? format(filters.dateRange.from, 'LLL dd, y')
									: format(filters.dateRange.to!, 'LLL dd, y')}
							<Button2
								variant="ghost"
								size="icon"
								className="ml-1 h-4 w-4 p-0"
								onClick={() => {
									setDateRange({ from: undefined, to: undefined });
									handleDateRangeChange();
								}}
							>
								<X className="h-3 w-3" />
								<span className="sr-only">Remove date range filter</span>
							</Button2>
						</Badge>
					)}
				</div>
			)}
		</div>
	);
}
