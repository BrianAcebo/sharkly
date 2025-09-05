import { useState, useEffect } from 'react';
import type { Lead } from '../../types/leads';
import { formatDate, formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Bookmark,
	Share2,
	MoreHorizontal,
	Edit,
	Search,
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { getStageColor, getStageLabel } from '../../utils/stages';
import { LEAD_PRIORITIES } from '../../utils/constants';

interface SearchResultsProps {
	leads: Lead[];
	totalLeads: number;
	currentPage: number;
	totalPages: number;
	perPage: number;
	onPageChange: (page: number) => void;
	onPerPageChange: (perPage: number) => void;
	onEditLead: (lead: Lead) => void;
}

export function SearchResults({ 
	leads, 
	totalLeads,
	currentPage, 
	totalPages, 
	perPage,
	onPageChange, 
	onPerPageChange,
	onEditLead
}: SearchResultsProps) {
	const [selectedResult, setSelectedResult] = useState<Lead | null>(leads[0] ?? null);

	useEffect(() => {
		setSelectedResult(leads[0] ?? null);
	}, [leads]);

	const getPriorityColor = (status: string) => {
		switch (status) {
			case LEAD_PRIORITIES.LOW:
				return 'border-none text-green-700 dark:text-green-400';
			case LEAD_PRIORITIES.MEDIUM:
				return 'border-none text-amber-700 dark:text-amber-400';
			case LEAD_PRIORITIES.HIGH:
				return 'border-none text-red-700 dark:text-red-400';
			case LEAD_PRIORITIES.CRITICAL:
				return 'border-none text-red-900 dark:text-red-600';
		}
	};

	// Handle page change
	const handlePageChange = (page: number) => {
		onPageChange(page);
		// Scroll to top of results
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	if (leads.length === 0) {
		return (
			<div className="bg-card flex flex-col items-center justify-center rounded-lg border p-8 text-center">
				<div className="bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
					<Search className="h-10 w-10 text-gray-600 dark:text-gray-300" />
				</div>
				<h3 className="mb-2 text-xl font-semibold">No leads found</h3>
				<p className="max-w-md text-gray-600 dark:text-gray-300">
					We couldn't find any leads matching your criteria. Try adjusting your search terms or filters.
				</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
			<div className="col-span-1 md:col-span-2">
				<div className="grid grid-cols-1 gap-4">
					{leads.map((lead) => (
						<Card
                            key={lead.id}
                        >
                            <CardHeader className="p-6">
                                <div className="flex flex-col items-start justify-between gap-3 md:flex-row">
                                    <div className="flex items-center space-x-2">
                                        <Avatar className="h-8 w-8 border">
                                            <AvatarFallback>{lead.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium">{lead.name}</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-300">
                                                Updated:{' '}
                                                {formatDistanceToNow(new Date(lead.updated_at), {
                                                    addSuffix: true
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex w-full items-center justify-between md:w-fit">
                                        <div>
                                            <span className="flex items-center gap-2 text-sm">
                                                Priority:
                                                <span className={`text-xs uppercase ${getPriorityColor(lead.priority)}`}>
                                                    {lead.priority}
                                                </span>
                                            </span>
                                        </div>

                                        <div className="mx-5 hidden h-5 w-[0.5px] border-r md:block"></div>

                                        <div className="flex items-center justify-between">
                                            <Badge
                                                variant="outline"
                                                className={`text-xs capitalize ${getStageColor(lead.stage)}`}
                                            >
                                                {getStageLabel(lead.stage)}
                                            </Badge>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="ml-1 h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">More options</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => onEditLead(lead)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>Share</DropdownMenuItem>
                                                    <DropdownMenuItem>Save</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0 pb-6">
                                <div className="cursor-pointer" onClick={() => setSelectedResult(lead)}>
                                    <h3 className="hover:text-primary mb-1 text-xl font-semibold transition-colors">
                                        {lead.title || `${lead.name} - ${lead.company || 'No Company'}`}
                                    </h3>
                                    <p className="mb-5 text-gray-600 dark:text-gray-300">
                                        {`${lead.email} • ${lead.phone || 'No phone'}`}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600 dark:text-gray-300">Created: {formatDate(lead.created_at, 'MMM d, yyyy')}</span>
                                        {lead.category && (
                                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                                • {lead.category}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                            <Separator />
                            <CardFooter className="flex items-center justify-between p-3">
                                <div className="flex flex-wrap gap-1">
                                    {lead.tags && lead.tags.length > 0 ? (
                                        lead.tags.map((tag, index) => (
                                            <Badge
                                                key={index}
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {tag}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">No tags</span>
                                    )}
                                </div>
                                <div className="flex space-x-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Bookmark className="h-4 w-4" />
                                        <span className="sr-only">Bookmark</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Share2 className="h-4 w-4" />
                                        <span className="sr-only">Share</span>
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
					))}
				</div>

				{/* Pagination Controls */}
				{totalPages > 1 && (
					<div className="flex items-center justify-between px-2 mt-6">
						<div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
							<span>
								Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, totalLeads)} of {totalLeads} leads
							</span>
						</div>
						
						<div className="flex items-center space-x-4">
							<div className="flex items-center space-x-2">
								<label htmlFor="perPage" className="text-sm text-gray-600 dark:text-gray-400">
									Items per page:
								</label>
								<select
									id="perPage"
									value={perPage}
									onChange={(e) => onPerPageChange(Number(e.target.value))}
									className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
								>
									<option value={10}>10</option>
									<option value={25}>25</option>
									<option value={50}>50</option>
									<option value={100}>100</option>
								</select>
							</div>
							
							<div className="flex items-center space-x-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => handlePageChange(1)}
									disabled={currentPage === 1}
								>
									<ChevronsLeft className="h-4 w-4" />
								</Button>
								
								<Button
									variant="outline"
									size="sm"
									onClick={() => handlePageChange(currentPage - 1)}
									disabled={currentPage === 1}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								
								<div className="flex items-center space-x-1">
									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										let pageNum;
										if (totalPages <= 5) {
											pageNum = i + 1;
										} else if (currentPage <= 3) {
											pageNum = i + 1;
										} else if (currentPage >= totalPages - 2) {
											pageNum = totalPages - 4 + i;
										} else {
											pageNum = currentPage - 2 + i;
										}
										
										return (
											<Button
												key={pageNum}
												variant={currentPage === pageNum ? "default" : "outline"}
												size="sm"
												onClick={() => handlePageChange(pageNum)}
												className="w-8 h-8 p-0"
											>
												{pageNum}
											</Button>
										);
									})}
								</div>
								
								<Button
									variant="outline"
									size="sm"
									onClick={() => handlePageChange(currentPage + 1)}
									disabled={currentPage === totalPages}
								>
									Next
									<ChevronRight className="ml-2 h-4 w-4" />
								</Button>
								
								<Button
									variant="outline"
									size="sm"
									onClick={() => handlePageChange(totalPages)}
									disabled={currentPage === totalPages}
								>
									Last
									<ChevronsRight className="ml-2 h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Details panel */}
			<div className="col-span-1 md:block">
				{selectedResult ? (
					<Card className="animate-in slide-in-from-right-5 sticky top-0 duration-200">
						<CardHeader>
							<div className="flex items-center justify-between gap-5">
								<h3 className="text-xl font-semibold">
									{selectedResult.title || `${selectedResult.name} - ${selectedResult.company || 'No Company'}`}
								</h3>
								<div className="flex flex-col items-end gap-2">
									<Badge
										variant="outline"
										className={`capitalize ${getStageColor(selectedResult.stage)}`}
									>
										{getStageLabel(selectedResult.stage)}
									</Badge>
									<span className="flex text-sm">
										Priority:
										<span>
											<Badge
												variant="outline"
												className={`uppercase ${getPriorityColor(selectedResult.priority)}`}
											>
												{selectedResult.priority}
											</Badge>
										</span>
									</span>
								</div>
							</div>
						</CardHeader>
						<Separator />
						<CardContent className="pt-4">
							<div className="mb-4 flex items-center space-x-3">
								<Avatar className="h-10 w-10 border">
									<AvatarFallback>{selectedResult.name.charAt(0)}</AvatarFallback>
								</Avatar>
								<div>
									<p className="font-medium">{selectedResult.name}</p>
                                    <div className="mt-2 flex flex-col gap-1">
                                        <p className="text-xs text-gray-600 capitalize dark:text-gray-300">
                                            Created: {formatDate(selectedResult.created_at, 'MMM d, yyyy')}
                                        </p>
                                        <p className="text-xs text-gray-600 capitalize dark:text-gray-300">
                                            Updated:{' '}
                                            {formatDistanceToNow(new Date(selectedResult.updated_at), {
                                                addSuffix: true
                                            })}
                                        </p>
                                    </div>
								</div>
							</div>

							<p className="mb-4 text-gray-600 dark:text-gray-300">
								{`${selectedResult.email} • ${selectedResult.phone || 'No phone'}`}
							</p>

							<div className="mb-4 grid grid-cols-2 gap-4">
								<div className="flex flex-col space-y-1">
									<span className="text-xs text-gray-600 dark:text-gray-300">Company</span>
									<span className="font-medium">{selectedResult.company || 'Not specified'}</span>
								</div>
								<div className="flex flex-col space-y-1">
									<span className="text-xs text-gray-600 dark:text-gray-300">Last Contact</span>
									{selectedResult.last_contact ? (
										<span className="text-sm text-gray-600 capitalize dark:text-gray-300">
											{formatDistanceToNow(new Date(selectedResult.last_contact || ''), {
												addSuffix: true
											})}
										</span>
									) : (
										<span className="text-sm text-gray-600 capitalize dark:text-gray-300">No contact yet</span>
									)}
								</div>
							</div>

							{/* Tags Section */}
							<div className="mb-4 flex flex-col space-y-2">
								<span className="text-xs text-gray-600 dark:text-gray-300">Tags</span>
								<div className="flex flex-wrap gap-1">
									{selectedResult.tags && selectedResult.tags.length > 0 ? (
										selectedResult.tags.map((tag, index) => (
											<Badge
												key={index}
												variant="secondary"
												className="text-xs"
											>
												{tag}
											</Badge>
										))
									) : (
										<span className="text-xs text-gray-500 dark:text-gray-400">No tags</span>
									)}
								</div>
							</div>

							{/* Value Section */}
							{Number(selectedResult.value) > 0 && (
								<div className="mb-4 flex flex-col space-y-1">
									<span className="text-xs text-gray-600 dark:text-gray-300">Value</span>
									<span className="font-medium text-green-600 dark:text-green-400">
										${selectedResult.value?.toLocaleString()}
									</span>
								</div>
							)}

							{/* Notes Section */}
							{selectedResult.notes && (
								<div className="mb-4 flex flex-col space-y-1">
									<span className="text-xs text-gray-600 dark:text-gray-300">Notes</span>
									<p className="text-sm text-gray-700 dark:text-gray-300">
										{selectedResult.notes}
									</p>
								</div>
							)}

							<a href={`/leads/${selectedResult.id}`}>
								<Button variant="flat" size="sm" className="w-full">
									View
								</Button>
							</a>
						</CardContent>
					</Card>
				) : (
					<Card className="animate-in slide-in-from-right-5 sticky top-0 duration-200">
						<CardHeader>
							<h3 className="text-xl font-semibold">Select a lead</h3>
						</CardHeader>
						<Separator />
						<CardContent className="pt-4">
							<p className="text-sm text-gray-600 dark:text-gray-400">
								Choose a lead from the list to view detailed information.
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
