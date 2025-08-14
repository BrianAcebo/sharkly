import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Communication, Lead } from '../types/leads';

interface ProfileStats {
	leadsCreated: number;
	conversations: number;
	conversionRate: number;
	responseTime: string;
	leadsWon: number;
	leadsLost: number;
	totalValue: number;
	avgDealSize: number;
}

interface ActivityItem {
	id: string;
	action: string;
	target: string;
	time: string;
	type: 'lead' | 'update' | 'communication' | 'call' | 'conversion';
	timestamp: string;
}

export const useProfileStats = () => {
	const { user } = useAuth();
	const [stats, setStats] = useState<ProfileStats>({
		leadsCreated: 0,
		conversations: 0,
		conversionRate: 0,
		responseTime: '0h',
		leadsWon: 0,
		leadsLost: 0,
		totalValue: 0,
		avgDealSize: 0
	});
	const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!user?.organization_id) return;

		const fetchProfileStats = async () => {
			setLoading(true);
			try {
				// Fetch leads created by this user
				const { data: leads, error: leadsError } = await supabase
					.from('leads')
					.select('*')
					.eq('organization_id', user.organization_id)
					.eq('created_by', user.id);

				if (leadsError) throw leadsError;

				// Fetch communications for this user
				const { data: communications, error: commError } = await supabase
					.from('communications')
					.select('*')
					.eq('organization_id', user.organization_id)
					.eq('user_id', user.id);

				if (commError) throw commError;

				// Calculate statistics
				const leadsCreated = leads?.length || 0;
				const conversations = communications?.length || 0;
				
				// Calculate conversion rate (leads won / total leads)
				const leadsWon = leads?.filter(lead => lead.stage === 'closed-won').length || 0;
				const leadsLost = leads?.filter(lead => lead.stage === 'closed-lost').length || 0;
				const totalLeads = leadsCreated;
				const conversionRate = totalLeads > 0 ? Math.round((leadsWon / totalLeads) * 100) : 0;

				// Calculate total value and average deal size
				const totalValue = leads?.reduce((sum, lead) => sum + (lead.value || 0), 0) || 0;
				const avgDealSize = leadsWon > 0 ? Math.round(totalValue / leadsWon) : 0;

				// Calculate average response time (simplified - could be enhanced with actual response tracking)
				const responseTime = calculateResponseTime(communications || []);

				// Generate recent activity from leads and communications
				const activity = generateRecentActivity(leads || [], communications || []);

				setStats({
					leadsCreated,
					conversations,
					conversionRate,
					responseTime,
					leadsWon,
					leadsLost,
					totalValue,
					avgDealSize
				});

				setRecentActivity(activity);
			} catch (error) {
				console.error('Error fetching profile stats:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchProfileStats();
	}, [user?.organization_id, user?.id]);

	return { stats, recentActivity, loading };
};

// Calculate average response time based on communications
const calculateResponseTime = (communications: Communication[]): string => {
	if (!communications || communications.length === 0) return '0h';

	// This is a simplified calculation - in a real app you'd track actual response times
	// For now, we'll simulate based on communication frequency
	const avgTimePerDay = communications.length / 30; // Assuming 30 days of data
	const responseTimeHours = avgTimePerDay > 0 ? Math.round(24 / avgTimePerDay) : 24;
	
	if (responseTimeHours < 24) {
		return `${responseTimeHours}h`;
	} else {
		const days = Math.round(responseTimeHours / 24);
		return `${days}d`;
	}
};

// Generate recent activity from leads and communications
const generateRecentActivity = (leads: Lead[], communications: Communication[]): ActivityItem[] => {
	const activities: ActivityItem[] = [];
	// const now = new Date();

	// Add lead activities
	leads.forEach((lead, index) => {
		if (index < 3) { // Limit to 3 most recent leads
			const timeAgo = getTimeAgo(new Date(lead.created_at));
			activities.push({
				id: `lead-${lead.id}`,
				action: 'Created new lead',
				target: `${lead.name} - ${lead.company || 'No Company'}`,
				time: timeAgo,
				type: 'lead',
				timestamp: lead.created_at
			});
		}
	});

	// Add communication activities
	communications.forEach((comm, index) => {
		if (index < 2) { // Limit to 2 most recent communications
			const timeAgo = getTimeAgo(new Date(comm.created_at));
			activities.push({
				id: `comm-${comm.id}`,
				action: getCommunicationAction(comm.type),
				target: comm.subject || 'Communication',
				time: timeAgo,
				type: 'communication',
				timestamp: comm.created_at
			});
		}
	});

	// Sort by timestamp and limit to 5 most recent
	return activities
		.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
		.slice(0, 5);
};

// Get communication action description
const getCommunicationAction = (type: string): string => {
	switch (type) {
		case 'email': return 'Sent email';
		case 'call': return 'Completed call';
		case 'meeting': return 'Scheduled meeting';
		case 'note': return 'Added note';
		default: return 'Communication';
	}
};

// Calculate time ago from timestamp
const getTimeAgo = (date: Date): string => {
	const now = new Date();
	const diffInMs = now.getTime() - date.getTime();
	const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
	const diffInDays = Math.floor(diffInHours / 24);

	if (diffInDays > 0) {
		return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
	} else if (diffInHours > 0) {
		return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
	} else {
		return 'Just now';
	}
};
