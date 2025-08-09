import express from 'express';
import { requireAuth } from '../middleware/auth';
import { emailService } from '../utils/email';
import { supabase } from '../utils/supabaseClient';

const router = express.Router();

// Email export endpoint
router.post('/export-email', requireAuth, async (req, res) => {
	try {
		const { email, filters = {} } = req.body;
		const userId = req.user?.id;

		if (!email || !email.includes('@')) {
			return res.status(400).json({
				error: { message: 'Valid email address is required' }
			});
		}

		if (!userId) {
			return res.status(401).json({
				error: { message: 'User not authenticated' }
			});
		}

		// Get user's organization
		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.single();

		if (!userOrg?.organization_id) {
			return res.status(400).json({
				error: { message: 'User not associated with any organization' }
			});
		}

		// Build query with filters
		let query = supabase
			.from('leads')
			.select('*')
			.eq('organization_id', userOrg.organization_id);

		// Apply filters
		if (filters.stage && filters.stage !== 'all') {
			query = query.eq('stage', filters.stage);
		}

		if (filters.priority && filters.priority !== 'all') {
			query = query.eq('priority', filters.priority);
		}

		if (filters.status && filters.status !== 'all') {
			query = query.eq('status', filters.status);
		}

		if (filters.dateRange?.from) {
			query = query.gte('created_at', filters.dateRange.from);
		}

		if (filters.dateRange?.to) {
			query = query.lte('created_at', filters.dateRange.to);
		}

		const { data: leads, error } = await query;

		if (error) {
			console.error('Error fetching leads:', error);
			return res.status(500).json({
				error: { message: 'Failed to fetch leads' }
			});
		}

		if (!leads || leads.length === 0) {
			return res.status(400).json({
				error: { message: 'No leads found matching the criteria' }
			});
		}

		// Generate CSV content
		const csvHeaders = [
			'Name', 'Email', 'Phone', 'Company', 'Title', 'Stage', 'Priority', 
			'Value', 'Notes', 'Tags', 'Status', 'Created At', 'Assigned To'
		];

		const escapeCsvField = (field: string): string => {
			if (!field) return '';
			if (field.includes(',') || field.includes('"') || field.includes('\n')) {
				return `"${field.replace(/"/g, '""')}"`;
			}
			return field;
		};

		const csvRows = leads.map(lead => [
			escapeCsvField(lead.name || ''),
			escapeCsvField(lead.email || ''),
			escapeCsvField(lead.phone || ''),
			escapeCsvField(lead.company || ''),
			escapeCsvField(lead.title || ''),
			escapeCsvField(lead.stage || ''),
			escapeCsvField(lead.priority || ''),
			escapeCsvField(lead.value?.toString() || ''),
			escapeCsvField(lead.notes || ''),
			escapeCsvField(lead.tags?.join(', ') || ''),
			escapeCsvField(lead.status || ''),
			escapeCsvField(new Date(lead.created_at).toISOString()),
			escapeCsvField(lead.assigned_to || '')
		]);

		const csvContent = [
			csvHeaders.join(','),
			...csvRows.map(row => row.join(','))
		].join('\n');

		// Add BOM for Excel compatibility
		const BOM = '\uFEFF';
		const csvWithBOM = BOM + csvContent;

		// Send email with CSV attachment
		try {
			await emailService.sendEmail({
				to: email,
				subject: `Leads Export - ${new Date().toLocaleDateString()}`,
				text: `Your leads export is attached.\n\nTotal leads: ${leads.length}\nExported on: ${new Date().toLocaleString()}`,
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px;">
						<h2>Your Leads Export</h2>
						<p>Your leads export is attached to this email.</p>
						<p><strong>Total leads:</strong> ${leads.length}</p>
						<p><strong>Exported on:</strong> ${new Date().toLocaleString()}</p>
						<p>If you have any questions, please contact support.</p>
					</div>
				`,
				attachments: [{
					filename: `leads-export-${new Date().toISOString().split('T')[0]}.csv`,
					content: csvWithBOM,
					contentType: 'text/csv'
				}]
			});
		} catch (emailError) {
			console.error('Email service error:', emailError);
			return res.status(500).json({
				error: { message: 'Failed to send email: ' + (emailError instanceof Error ? emailError.message : 'Unknown error') }
			});
		}

		res.json({
			message: 'Leads export sent successfully',
			leadsCount: leads.length
		});

	} catch (error) {
		console.error('Error sending email export:', error);
		res.status(500).json({
			error: { message: 'Failed to send email export' }
		});
	}
});

export default router; 