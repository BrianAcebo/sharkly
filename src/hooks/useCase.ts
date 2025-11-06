import type { Case, PriorityFilter, CaseStatusFilter, SearchFilter } from '../types/case';
import { listCases } from '../api/cases';
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
export const getSearchResults = async (
    organizationId: string,
    query: string,
    filters: SearchFilter = {},
    page: number = 1,
    perPage: number = 5,
    assignedToId?: string
): Promise<{ results: Case[]; total: number }> => {
    const isArchivedStatus = filters.status === ('archived' as unknown as SearchFilter['status']);
    const { results, total } = await listCases({
        organizationId,
        search: query || undefined,
        status: (isArchivedStatus ? 'all' : (filters.status ?? 'all')) as 'all' | Case['status'],
        priority: (filters.priorityLevel ?? 'all') as 'all' | Case['priority'],
        page,
        perPage,
        from: filters.dateRange?.from ? filters.dateRange.from.toISOString() : undefined,
        to: filters.dateRange?.to ? filters.dateRange.to.toISOString() : undefined,
        sortBy: (filters.sortBy ?? 'recent') as 'recent' | 'priority' | 'alphabetical',
        label: (filters.label ?? 'all') as 'all' | 'important',
        assignedToId,
        category: filters.category ?? undefined,
        tag: filters.tag ?? undefined,
        includeArchived:
            isArchivedStatus
                ? true
                : (filters as SearchFilter).includeArchived ?? (filters as SearchFilter & { include_archived?: boolean }).include_archived,
        archivedOnly:
            isArchivedStatus
                ? true
                : (filters as SearchFilter & { archivedOnly?: boolean }).archivedOnly
    });
    return { results, total };
};
