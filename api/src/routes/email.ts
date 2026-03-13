import express from 'express';
import { emailService } from '../utils/email.js';

const router = express.Router();

// POST /api/email/test
// Body: { to?: string }
router.post('/test', async (req, res) => {
	try {
		const { to } = req.body as { to?: string };

		const target = to || req.user?.email || process.env.TEST_EMAIL_TO;
		if (!target) {
			return res
				.status(400)
				.json({ error: { message: 'Provide a to email or set TEST_EMAIL_TO' } });
		}

		await emailService.sendEmail({
			to: target,
			subject: 'Sharkly - Test Email',
			text: 'This is a test email sent via Resend.',
			html: '<p>This is a <strong>test email</strong> sent via Resend.</p>'
		});

		return res.json({ message: `Test email sent to ${target}` });
	} catch (err) {
		console.error('Test email error:', err);
		return res.status(500).json({ error: { message: 'Failed to send test email' } });
	}
});

// POST /api/email/test-template
// Body: { to?: string, type?: 'teamMemberInvite' | 'organizationDeleted' | 'trialStarted' | 'trialEndingSoon' | 'trialEndsTomorrow' | 'trialEnded', ...optional template data }
router.post('/test-template', async (req, res) => {
	try {
		const { to, type } = req.body as {
			to?: string;
			type?:
				| 'teamMemberInvite'
				| 'organizationDeleted'
				| 'trialStarted'
				| 'trialEndingSoon'
				| 'trialEndsTomorrow'
				| 'trialEnded';
		};

		const target = to || process.env.TEST_EMAIL_TO;
		if (!target) {
			return res
				.status(400)
				.json({ error: { message: 'Provide a to email or set TEST_EMAIL_TO' } });
		}

		// Defaults with overrides from body
		const orgName: string = req.body?.orgName || 'Acme Co.';
		const role: string = req.body?.role || 'member';
		const firstName: string = req.body?.firstName || 'Brian';
		const inviteId: string = req.body?.inviteId || 'test-invite-id';
		const trialEndIso: string =
			req.body?.trialEnd || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
		const daysRemaining: number =
			typeof req.body?.daysRemaining === 'number' ? req.body.daysRemaining : 3;

		switch (type) {
			case 'organizationDeleted':
				await emailService.sendOrganizationDeletedNotification(target, orgName, firstName);
				break;
			case 'trialStarted':
				await emailService.sendTrialStarted(target, orgName, trialEndIso);
				break;
			case 'trialEndingSoon':
				await emailService.sendTrialEndingSoon(target, orgName, daysRemaining, trialEndIso);
				break;
			case 'trialEndsTomorrow':
				await emailService.sendTrialEndsTomorrow(target, orgName, trialEndIso);
				break;
			case 'trialEnded':
				await emailService.sendTrialEnded(target, orgName, trialEndIso);
				break;
			case 'teamMemberInvite':
			default:
				await emailService.sendTeamMemberInvite(target, orgName, role, inviteId);
				break;
		}

		return res.json({ message: `Template email sent to ${target}` });
	} catch (err) {
		console.error('Test template email error:', err);
		return res.status(500).json({ error: { message: 'Failed to send template email' } });
	}
});

export default router;
