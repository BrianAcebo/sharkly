import nodemailer from 'nodemailer';
import { config } from '../config';

interface EmailOptions {
	to: string;
	subject: string;
	text: string;
	html: string;
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
	private transporter: nodemailer.Transporter;

	constructor() {
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

	async sendEmail(options: EmailOptions): Promise<void> {
		try {
			await this.transporter.sendMail({
				from: config.smtp.from,
				...options
			});
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
