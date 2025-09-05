import PageMeta from '../components/common/PageMeta';
import LeadProfile from '../components/leads/LeadProfile';
import { useLeads } from '../hooks/useLeads';
import { useParams } from 'react-router';
import NotFound from './Error/NotFound';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect } from 'react';

export default function LeadsPage() {
	const { leads } = useLeads();
	const { id } = useParams<{ id: string }>();
	const { setTitle } = useBreadcrumbs();
  
	// Find the selected lead by ID from the URL params
	const selectedLead = leads.find(lead => lead.id === id);

	useEffect(() => {
		setTitle(selectedLead?.name ?? '');
	}, [setTitle, selectedLead]);

	if (!selectedLead) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-500 mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading lead...</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<PageMeta title={`Lead ${selectedLead?.name}`} description={`View and edit ${selectedLead?.name}'s profile`} />
			{selectedLead ? <LeadProfile lead={selectedLead} /> : <NotFound />}
		</>
	);
}