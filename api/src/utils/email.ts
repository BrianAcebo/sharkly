import nodemailer from 'nodemailer';
import { config } from '../config';

interface EmailAttachment {
	filename: string;
	content: string;
	contentType?: string;
}

interface EmailOptions {
	to: string;
	subject: string;
	text: string;
	html: string;
	attachments?: EmailAttachment[];
	from?: string;
	replyTo?: string;
}

type TemplateData = {
	teamMemberInvite: {
		orgName: string;
		role: string;
		inviteLink: string;
	};
	organizationDeleted: {
		orgName: string;
		firstName: string;
	};
};

const templates = {
	teamMemberInvite: {
		subject: (orgName: string) => `Invitation to join ${orgName}`,
		text: (data: TemplateData['teamMemberInvite']) => `
			You have been invited to join ${data.orgName} as an ${data.role}.
			
			Click the link below to accept the invitation:
			${data.inviteLink}
			
			If you did not expect this invitation, please ignore this email.
		`,
		html: (data: TemplateData['teamMemberInvite']) => `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Team Member Invitation</title>
				<style>
					/* Reset and base styles */
					* { margin: 0; padding: 0; box-sizing: border-box; }
					body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; }
					
					/* Container */
					.email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
					
					/* Header */
					.email-header { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #fecaca; }
					.email-header h1 { color: #dc2626; font-size: 28px; font-weight: 700; margin-bottom: 8px; }
					.email-header p { color: #6b7280; font-size: 16px; }
					
					/* Content */
					.email-content { padding: 40px 32px; }
					.invite-details { background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid #f87171; }
					.detail-row { display: flex; align-items: center; margin-bottom: 16px; }
					.detail-row:last-child { margin-bottom: 0; }
					.detail-icon { width: 20px; height: 20px; margin-right: 12px; color: #f87171; }
					.detail-label { font-weight: 600; color: #374151; min-width: 80px; }
					.detail-value { color: #6b7280; }
					
					/* Branded Button */
					.branded-button { 
						display: inline-block; 
						background: linear-gradient(135deg, #f87171 0%, #ef4444 50%, #dc2626 100%); 
						color: #ffffff !important; 
						text-decoration: none; 
						padding: 16px 32px; 
						border-radius: 8px; 
						font-weight: 600; 
						font-size: 16px; 
						text-align: center; 
						box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3), 0 2px 4px -1px rgba(239, 68, 68, 0.2);
						transition: all 0.2s ease-in-out;
						border: none;
						cursor: pointer;
						min-width: 200px;
					}
					.branded-button:hover { 
						background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%); 
						transform: translateY(-1px);
						box-shadow: 0 6px 8px -1px rgba(239, 68, 68, 0.4), 0 4px 6px -1px rgba(239, 68, 68, 0.3);
					}
					.branded-button:active { 
						transform: translateY(0);
						box-shadow: 0 2px 4px -1px rgba(239, 68, 68, 0.3);
					}
					
					/* Button Container */
					.button-container { text-align: center; margin: 32px 0; }
					
					/* Footer */
					.email-footer { background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb; }
					.email-footer p { color: #9ca3af; font-size: 14px; }
					
					/* Responsive */
					@media (max-width: 600px) {
						.email-container { margin: 16px; border-radius: 8px; }
						.email-header, .email-content, .email-footer { padding: 24px 20px; }
						.email-header h1 { font-size: 24px; }
						.branded-button { padding: 14px 24px; font-size: 15px; min-width: 180px; }
					}
				</style>
			</head>
			<body>
				<div class="email-container">
					<div class="email-header">
						<h1>🎯 Team Invitation</h1>
						<p>You've been invited to join a team on Paperboat CRM</p>
					</div>
					
					<div class="email-content">
						<p style="margin-bottom: 24px; font-size: 16px; color: #374151;">
							You have been invited to join <strong>${data.orgName}</strong> as a <strong>${data.role}</strong>.
						</p>
						
						<div class="invite-details">
							<div class="detail-row">
								<div class="detail-icon">🏢</div>
								<div class="detail-label">Organization:</div>
								<div class="detail-value">${data.orgName}</div>
							</div>
							<div class="detail-row">
								<div class="detail-icon">👤</div>
								<div class="detail-label">Your Role:</div>
								<div class="detail-value">${data.role}</div>
							</div>
							<div class="detail-row">
								<div class="detail-icon">🔗</div>
								<div class="detail-label">Invitation:</div>
								<div class="detail-value">Valid for 7 days</div>
							</div>
						</div>
						
						<div class="button-container">
							<a href="${data.inviteLink}" class="branded-button">
								Accept Invitation
							</a>
						</div>
						
						<p style="margin-top: 24px; font-size: 14px; color: #6b7280; text-align: center;">
							Click the button above to accept this invitation and join the team.
						</p>
					</div>
					
					<div class="email-footer">
						<p>If you did not expect this invitation, please ignore this email.</p>
						<p style="margin-top: 8px;">© ${new Date().getFullYear()} Paperboat CRM. All rights reserved.</p>
					</div>
				</div>
			</body>
			</html>
		`
	},
	organizationDeleted: {
		subject: (orgName: string) => `Organization ${orgName} has been deleted`,
		text: (data: TemplateData['organizationDeleted']) => `
			Hello ${data.firstName},
			
			We're writing to inform you that the organization "${data.orgName}" that you were a member of has been deleted by the organization owner.
			
			This means:
			- You no longer have access to any data or resources from this organization
			- All your leads, tasks, and other organization-specific data have been permanently removed
			- You will need to be invited to a new organization to continue using Paperboat CRM
			
			If you have any questions or concerns, please contact our support team.
			
			Best regards,
			The Paperboat CRM Team
		`,
		html: (data: TemplateData['organizationDeleted']) => `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Organization Deleted</title>
				<style>
					/* Reset and base styles */
					* { margin: 0; padding: 0; box-sizing: border-box; }
					body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; }
					
					/* Container */
					.email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
					
					/* Header */
					.email-header { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #f59e0b; }
					.email-header h1 { color: #d97706; font-size: 28px; font-weight: 700; margin-bottom: 8px; }
					.email-header p { color: #6b7280; font-size: 16px; }
					
					/* Content */
					.email-content { padding: 40px 32px; }
					.warning-box { background-color: #fef3c7; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid #f59e0b; }
					.warning-box h3 { color: #d97706; font-size: 18px; font-weight: 600; margin-bottom: 12px; }
					.warning-box ul { list-style: none; padding: 0; }
					.warning-box li { color: #92400e; margin-bottom: 8px; padding-left: 20px; position: relative; }
					.warning-box li:before { content: "⚠️"; position: absolute; left: 0; }
					
					/* Info Box */
					.info-box { background-color: #f0f9ff; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid #0ea5e9; }
					.info-box h3 { color: #0369a1; font-size: 18px; font-weight: 600; margin-bottom: 12px; }
					.info-box p { color: #0c4a6e; margin-bottom: 8px; }
					
					/* Footer */
					.email-footer { background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb; }
					.email-footer p { color: #9ca3af; font-size: 14px; }
					
					/* Responsive */
					@media (max-width: 600px) {
						.email-container { margin: 16px; border-radius: 8px; }
						.email-header, .email-content, .email-footer { padding: 24px 20px; }
						.email-header h1 { font-size: 24px; }
					}
				</style>
			</head>
			<body>
				<div class="email-container">
					<div class="email-header">
						<h1>⚠️ Organization Deleted</h1>
						<p>Important notice about your organization access</p>
					</div>
					
					<div class="email-content">
						<p style="margin-bottom: 24px; font-size: 16px; color: #374151;">
							Hello <strong>${data.firstName}</strong>,
						</p>
						
						<p style="margin-bottom: 24px; font-size: 16px; color: #374151;">
							We're writing to inform you that the organization <strong>"${data.orgName}"</strong> that you were a member of has been deleted by the organization owner.
						</p>
						
						<div class="warning-box">
							<h3>What this means for you:</h3>
							<ul>
								<li>You no longer have access to any data or resources from this organization</li>
								<li>All your leads, tasks, and other organization-specific data have been permanently removed</li>
								<li>You will need to be invited to a new organization to continue using Paperboat CRM</li>
							</ul>
						</div>
						
						<div class="info-box">
							<h3>Next Steps</h3>
							<p>If you need to continue using Paperboat CRM, you'll need to:</p>
							<p>1. Be invited to a new organization by an organization owner</p>
							<p>2. Or create your own organization if you have the appropriate permissions</p>
						</div>
						
						<p style="margin-top: 24px; font-size: 14px; color: #6b7280; text-align: center;">
							If you have any questions or concerns, please contact our support team.
						</p>
					</div>
					
					<div class="email-footer">
						<p>Best regards,</p>
						<p style="margin-top: 8px;">The Paperboat CRM Team</p>
						<p style="margin-top: 8px;">© ${new Date().getFullYear()} Paperboat CRM. All rights reserved.</p>
					</div>
				</div>
			</body>
			</html>
		`
	}
	// Add more templates here as needed
} as const;

class EmailService {
	private transporter: nodemailer.Transporter | null = null;
	private isDevMode: boolean;

	constructor() {
		this.isDevMode = process.env.NODE_ENV === 'development' || !config.smtp.user || !config.smtp.pass;
		
		if (!this.isDevMode) {
			this.transporter = nodemailer.createTransport({
				host: config.smtp.host,
				port: config.smtp.port,
				secure: config.smtp.secure,
				auth: {
					user: config.smtp.user,
					pass: config.smtp.pass
				}
			});
		}
	}

	async sendEmail(options: EmailOptions): Promise<void> {
		try {
			if (this.isDevMode) {
				// In development mode, just log the email details
				console.log('📧 DEV MODE - Email would be sent:');
				console.log('  From:', options.from || config.smtp.from);
				console.log('  Reply-To:', options.replyTo || config.smtp.from);
				console.log('  To:', options.to);
				console.log('  Subject:', options.subject);
				if (options.attachments && options.attachments.length > 0) {
					console.log('  Attachments:', options.attachments.map(a => a.filename));
				}
				console.log('  --- End of email log ---');
				return;
			}

			if (!this.transporter) {
				throw new Error('Email transporter not configured');
			}

			const mailOptions: {
				from: string;
				sender: string;
				replyTo: string;
				to: string;
				subject: string;
				text: string;
				html: string;
				attachments?: {
					filename: string;
					content: string;
					contentType?: string;
				}[];
				envelope: {
					from: string;
					to: string;
				};
			} = {
				from: options.from || `Paperboat CRM <${config.smtp.from}>`,
				sender: config.smtp.user || config.smtp.from, // actual authenticated sender
				replyTo: options.replyTo || config.smtp.from,
				to: options.to,
				subject: options.subject,
				text: options.text,
				html: options.html,
				envelope: {
					from: config.smtp.from,
					to: options.to
				}
			};

			// Add attachments if provided
			if (options.attachments && options.attachments.length > 0) {
				mailOptions.attachments = options.attachments.map(attachment => ({
					filename: attachment.filename,
					content: attachment.content,
					contentType: attachment.contentType || 'text/plain'
				}));
			}

			await this.transporter.sendMail(mailOptions);
		} catch (error) {
			console.error('Error sending email:', error);
			throw new Error('Failed to send email');
		}
	}

	async sendTemplateEmail<T extends keyof typeof templates>(
		template: T,
		to: string,
		data: TemplateData[T]
	): Promise<void> {
		const templateData = templates[template];
		
		// Type-safe subject generation
		let subject: string;
		if (template === 'teamMemberInvite') {
			subject = templateData.subject((data as TemplateData['teamMemberInvite']).orgName);
		} else if (template === 'organizationDeleted') {
			subject = templateData.subject((data as TemplateData['organizationDeleted']).orgName);
		} else {
			subject = templateData.subject('');
		}
		
		await this.sendEmail({
			to,
			subject,
			text: templateData.text(data as any),
			html: templateData.html(data as any)
		});
	}

	// Convenience method for sending team member invites
	async sendTeamMemberInvite(
		to: string,
		orgName: string,
		role: string,
		inviteId: string
	): Promise<void> {
		const inviteLink = `${config.frontendUrl}/invite/${inviteId}`;
		await this.sendTemplateEmail('teamMemberInvite', to, {
			orgName,
			role,
			inviteLink
		});
	}

	// Convenience method for sending organization deletion notifications
	async sendOrganizationDeletedNotification(
		to: string,
		orgName: string,
		firstName: string
	): Promise<void> {
		await this.sendTemplateEmail('organizationDeleted', to, {
			orgName,
			firstName
		});
	}
}

export const emailService = new EmailService();
