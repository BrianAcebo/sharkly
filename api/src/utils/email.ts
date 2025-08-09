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
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h1 style="color: #333;">You've been invited to join ${data.orgName}</h1>
				<p>You have been invited to join ${data.orgName} as an ${data.role}.</p>
				<p>Click the button below to accept the invitation:</p>
				<div style="text-align: center; margin: 30px 0;">
					<a href="${data.inviteLink}" 
					   style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
						Accept Invitation
					</a>
				</div>
				<p style="color: #666; font-size: 12px;">
					If you did not expect this invitation, please ignore this email.
				</p>
			</div>
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

			const mailOptions: any = {
				from: options.from || `Paperboat CRM <${config.smtp.from}>`,
				sender: config.smtp.user, // actual authenticated sender
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
		await this.sendEmail({
			to,
			subject: templateData.subject(data.orgName),
			text: templateData.text(data),
			html: templateData.html(data)
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
}

export const emailService = new EmailService();
