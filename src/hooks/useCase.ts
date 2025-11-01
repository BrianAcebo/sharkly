import type { Case, PriorityFilter, CaseStatusFilter, SearchFilter } from '../types/case';
import { mockCases } from '../data';
import { useContext } from 'react';
import { CaseContext } from '../contexts/CaseContext';

export const useCase = () => {
	const context = useContext(CaseContext);
	if (!context) {
		throw new Error('useCase must be used within a CaseProvider');
	}
	return context;
};

// Categories for filtering
export const priorityLevels: PriorityFilter[] = ['all', 'low', 'medium', 'high', 'critical'];
export const caseStatuses: CaseStatusFilter[] = ['all', 'active', 'closed', 'in_progress'];

// Get search results with filtering and pagination
export const getSearchResults = (
	query: string,
	filters: SearchFilter = {},
	page: number = 1,
	perPage: number = 5
): { results: Case[]; total: number } => {
	let filteredResults = [...mockCases];

	// Filter by search query
	if (query) {
		const lowerQuery = query.toLowerCase();
		filteredResults = filteredResults.filter((caseItem: Case) => {
			return (
				caseItem.title.toLowerCase().includes(lowerQuery) ||
				caseItem.entity.name.toLowerCase().includes(lowerQuery) ||
				caseItem.entity.email.toLowerCase().includes(lowerQuery) ||
				caseItem.entity.location.city.toLowerCase().includes(lowerQuery) ||
				caseItem.entity.location.country.toLowerCase().includes(lowerQuery) ||
				caseItem.entity.location.ip.toLowerCase().includes(lowerQuery) ||
				caseItem.entity.type.toLowerCase().includes(lowerQuery) ||
				caseItem.entity.devices.some((device) => device.type.toLowerCase().includes(lowerQuery)) ||
				caseItem.entity.socialProfiles.some((profile) => {
					return (
						profile.platform.toLowerCase().includes(lowerQuery) ||
						profile.username.toLowerCase().includes(lowerQuery)
					);
				}) ||
				caseItem.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
				caseItem.assignedTo.some(
					(investigator) =>
						investigator.profile.first_name.toLowerCase().includes(lowerQuery) ||
						investigator.profile.last_name.toLowerCase().includes(lowerQuery)
				)
			);
		});
	} else {
		filteredResults = [...mockCases];
	}

	// Filter by status
	if (filters.status && filters.status !== 'all') {
		filteredResults = filteredResults.filter((profile) => profile.status === filters.status);
	}

	// Filter by risk level
	if (filters.priorityLevel && filters.priorityLevel !== 'all') {
		filteredResults = filteredResults.filter(
			(caseItem) => caseItem.priority === filters.priorityLevel
		);
	}

	// Filter by date range
	if (filters.dateRange?.from || filters.dateRange?.to) {
		filteredResults = filteredResults.filter((caseItem) => {
			const createdDate = new Date(caseItem.createdAt);

			if (filters.dateRange?.from && filters.dateRange?.to) {
				return createdDate >= filters.dateRange.from && createdDate <= filters.dateRange.to;
			} else if (filters.dateRange?.from) {
				return createdDate >= filters.dateRange.from;
			} else if (filters.dateRange?.to) {
				return createdDate <= filters.dateRange.to;
			}

			return true;
		});
	}

	// Sort results
	if (filters.sortBy) {
		switch (filters.sortBy) {
			case 'recent':
				filteredResults.sort(
					(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
				break;
			case 'priority': {
				const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
				filteredResults.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
				break;
			}
			case 'alphabetical':
				filteredResults.sort((a, b) => a.title.localeCompare(b.title));
				break;
		}
	}

	// Calculate pagination
	const total = filteredResults.length;
	const startIndex = (page - 1) * perPage;
	const paginatedResults = filteredResults.slice(startIndex, startIndex + perPage);

	return {
		results: paginatedResults,
		total
	};
};
