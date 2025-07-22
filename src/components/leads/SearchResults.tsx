import * as React from 'react';
import { useState, useEffect } from 'react';
import type { Lead } from '../../contexts/DataContext';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import {
	ChevronLeft,
	ChevronRight,
	Calendar,
	Bookmark,
	Share2,
	MoreHorizontal,
	Edit
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '../ui/dropdown-menu';

interface SearchResultsProps {
	leads: Lead[];
	totalLeads: number;
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	onEditLead: (lead: Lead) => void;
}

export function SearchResults({ 
	leads, 
	currentPage, 
	totalPages, 
	onPageChange, 
	onEditLead 
}: SearchResultsProps) {
	const [selectedResult, setSelectedResult] = useState<Lead | null>(leads[0] ?? null);

	useEffect(() => {
		setSelectedResult(leads[0] ?? null);
	}, [leads]);

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

	const getStageColor = (stage: string) => {
		switch (stage) {
			case 'new':
				return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-900';
			case 'contacted':
				return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900';
			case 'qualified':
				return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900';
			case 'proposal':
				return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900';
			case 'closed-won':
				return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900';
			case 'closed-lost':
				return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900';
			default:
				return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-900';
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
					<SearchIcon className="h-10 w-10 text-gray-600 dark:text-gray-300" />
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
				<div className="space-y-5">
					{leads.map((lead) => (
						<Card
							key={lead.id}
							className={`overflow-hidden ${
								selectedResult?.id === lead.id ? 'ring-1 ring-offset-1' : 'hover:ring-1'
							}`}
						>
							<CardHeader className="p-6">
								<div className="flex flex-col items-start justify-between gap-3 md:flex-row">
									<div className="flex items-center space-x-2">
										<Avatar className="h-8 w-8 border">
											<AvatarImage src={lead.avatar} alt={lead.name} />
											<AvatarFallback>{lead.name.charAt(0)}</AvatarFallback>
										</Avatar>
										<div>
											<p className="text-sm font-medium">{lead.name}</p>
											<p className="text-xs text-gray-600 dark:text-gray-300">
												Updated:{' '}
												{formatDistanceToNow(new Date(lead.updatedAt), {
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
												className={`text-xs capitalize ${getStatusColor(lead.status)}`}
											>
												{lead.status.replace('in_progress', 'In Progress')}
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
										{lead.description || `${lead.email} • ${lead.phone || 'No phone'}`}
									</p>
									<div className="flex items-center gap-2">
										<Badge
											variant="outline"
											className={`text-xs capitalize ${getStageColor(lead.stage)}`}
										>
											{lead.stage.replace('-', ' ')}
										</Badge>
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

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="mt-6 flex items-center justify-between">
						<Button
							variant="outline"
							size="sm"
							onClick={() => handlePageChange(currentPage - 1)}
							disabled={currentPage === 1}
						>
							<ChevronLeft className="mr-2 h-4 w-4" />
							Previous
						</Button>
						<span className="text-sm text-gray-600 dark:text-gray-300">
							Page {currentPage} of {totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => handlePageChange(currentPage + 1)}
							disabled={currentPage === totalPages}
						>
							Next
							<ChevronRight className="ml-2 h-4 w-4" />
						</Button>
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
										className={`capitalize ${getStatusColor(selectedResult.status)}`}
									>
										{selectedResult.status.replace('in_progress', 'In Progress')}
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
									<AvatarImage
										src={selectedResult.avatar}
										alt={selectedResult.name}
									/>
									<AvatarFallback>{selectedResult.name.charAt(0)}</AvatarFallback>
								</Avatar>
								<div>
									<p className="font-medium">{selectedResult.name}</p>
									<p className="text-sm text-gray-600 capitalize dark:text-gray-300">
										Updated:{' '}
										{formatDistanceToNow(new Date(selectedResult.updatedAt), {
											addSuffix: true
										})}
									</p>
								</div>
							</div>

							<p className="mb-4 text-gray-600 dark:text-gray-300">
								{selectedResult.description || `${selectedResult.email} • ${selectedResult.phone || 'No phone'}`}
							</p>

							<div className="mb-4 grid grid-cols-2 gap-4">
								<div className="flex flex-col space-y-1">
									<span className="text-xs text-gray-600 dark:text-gray-300">Company</span>
									<span className="font-medium">{selectedResult.company || 'Not specified'}</span>
								</div>
								<div className="flex flex-col space-y-1">
									<span className="text-xs text-gray-600 dark:text-gray-300">Stage</span>
									<Badge
										variant="outline"
										className={`text-xs capitalize ${getStageColor(selectedResult.stage)}`}
									>
										{selectedResult.stage.replace('-', ' ')}
									</Badge>
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
										<span className="text-sm text-gray-500 dark:text-gray-400">No tags assigned</span>
									)}
								</div>
							</div>

							<div className="mb-4 flex flex-col space-y-1">
								<span className="text-xs text-gray-600 dark:text-gray-300">Last Updated</span>
								<div className="flex items-center text-sm">
									<Calendar className="mr-2 h-4 w-4 text-gray-600 dark:text-gray-300" />
									<span>{new Date(selectedResult.updatedAt).toLocaleString()}</span>
								</div>
							</div>
						</CardContent>
						<Separator />
						<CardFooter className="flex justify-end pt-4">
							<Button 
								variant="outline" 
								onClick={() => onEditLead(selectedResult)}
							>
								<Edit className="mr-2 h-4 w-4" />
								Edit Lead
							</Button>
						</CardFooter>
					</Card>
				) : (
					<Card className="bg-muted/40 flex h-[400px] items-center justify-center border-dashed p-8 text-center">
						<div className="max-w-sm">
							<h3 className="mb-2 text-lg font-medium">No lead selected</h3>
							<p className="text-sm text-gray-600 dark:text-gray-300">
								Select a lead from the list to view its details here.
							</p>
						</div>
					</Card>
				)}
			</div>
		</div>
	);
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			{...props}
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<circle cx="11" cy="11" r="8" />
			<path d="m21 21-4.3-4.3" />
		</svg>
	);
}
