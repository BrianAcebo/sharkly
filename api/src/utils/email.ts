import { Resend } from 'resend';
import { config } from '../config.js';

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
	trialStarted: {
		orgName: string;
		trialEnd: string; // ISO
	};
	trialEndingSoon: {
		orgName: string;
		daysRemaining: number;
		trialEnd: string; // ISO
	};
	trialEndsTomorrow: {
		orgName: string;
		trialEnd: string; // ISO
	};
	trialEnded: {
		orgName: string;
		trialEnd: string; // ISO
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
                    .email-header { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #bfdbfe; }
                    .email-header h1 { color: #2563eb; font-size: 28px; font-weight: 700; margin-bottom: 8px; }
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
                        background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%); 
						color: #ffffff !important; 
						text-decoration: none; 
						padding: 16px 32px; 
						border-radius: 8px; 
						font-weight: 600; 
						font-size: 16px; 
						text-align: center; 
                        box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(59, 130, 246, 0.2);
						transition: all 0.2s ease-in-out;
						border: none;
						cursor: pointer;
						min-width: 200px;
					}
					.branded-button:hover { 
                        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%); 
						transform: translateY(-1px);
                        box-shadow: 0 6px 8px -1px rgba(59, 130, 246, 0.4), 0 4px 6px -1px rgba(59, 130, 246, 0.3);
					}
					.branded-button:active { 
						transform: translateY(0);
                        box-shadow: 0 2px 4px -1px rgba(59, 130, 246, 0.3);
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
                        <p>You've been invited to join a team on Sharkly</p>
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
                        <p style="margin-top: 8px;">© ${new Date().getFullYear()} Sharkly. All rights reserved.</p>
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
			- All your organization specific data have been permanently removed
			- You will need to be invited to a new organization to continue using Sharkly
			
			If you have any questions or concerns, please contact our support team.
			
			Best regards,
			The Sharkly Team
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
                    .email-header { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #bfdbfe; }
                    .email-header h1 { color: #2563eb; font-size: 28px; font-weight: 700; margin-bottom: 8px; }
					.email-header p { color: #6b7280; font-size: 16px; }
					
					/* Content */
					.email-content { padding: 40px 32px; }
                    .warning-box { background-color: #eff6ff; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid #60a5fa; }
                    .warning-box h3 { color: #1d4ed8; font-size: 18px; font-weight: 600; margin-bottom: 12px; }
                    .warning-box ul { list-style: none; padding: 0; }
                    .warning-box li { color: #1e40af; margin-bottom: 8px; padding-left: 20px; position: relative; }
					.warning-box li:before { content: "⚠️"; position: absolute; left: 0; }
					
					/* Info Box */
                    .info-box { background-color: #f0f9ff; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid #60a5fa; }
                    .info-box h3 { color: #1d4ed8; font-size: 18px; font-weight: 600; margin-bottom: 12px; }
                    .info-box p { color: #1e40af; margin-bottom: 8px; }
					
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
								<li>All your organization specific data have been permanently removed</li>
								<li>You will need to be invited to a new organization to continue using Sharkly</li>
							</ul>
						</div>
						
						<div class="info-box">
							<h3>Next Steps</h3>
                            <p>If you need to continue using Sharkly, you'll need to:</p>
							<p>1. Be invited to a new organization by an organization owner</p>
							<p>2. Or create your own organization if you have the appropriate permissions</p>
						</div>
						
						<p style="margin-top: 24px; font-size: 14px; color: #6b7280; text-align: center;">
							If you have any questions or concerns, please contact our support team.
						</p>
					</div>
					
					<div class="email-footer">
                        <p>Best regards,</p>
                        <p style="margin-top: 8px;">The Sharkly Team</p>
                        <p style="margin-top: 8px;">© ${new Date().getFullYear()} Sharkly. All rights reserved.</p>
					</div>
				</div>
			</body>
			</html>
		`
	},
	trialStarted: {
		subject: (orgName: string) => `Your Sharkly trial has started for ${orgName}`,
		text: (data: TemplateData['trialStarted']) =>
			`Your trial for ${data.orgName} has started. It ends on ${new Date(data.trialEnd).toLocaleString()}.`,
		html: (data: TemplateData['trialStarted']) => `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Trial Started</title>
				<style>
					* { margin: 0; padding: 0; box-sizing: border-box; }
					body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; }
					.email-container { max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
                    .email-header { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 36px 28px; border-bottom: 1px solid #bfdbfe; text-align: center; }
                    .email-header h1 { color: #1d4ed8; font-size: 26px; font-weight: 800; }
					.email-content { padding: 32px 28px; }
                    .kpi { background-color: #f9fafb; border-left: 4px solid #60a5fa; border-radius: 8px; padding: 16px; margin: 16px 0; color: #374151; }
                    .cta { display: inline-block; background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%); color: #ffffff !important; text-decoration: none; padding: 14px 22px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.3), 0 2px 4px -1px rgba(59,130,246,0.2); margin-top: 18px; }
					.cta:hover { filter: brightness(1.05); }
					.email-footer { background-color: #f9fafb; padding: 22px 28px; text-align: center; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 13px; }
				</style>
			</head>
			<body>
				<div class="email-container">
					<div class="email-header">
						<h1>🎉 Your trial has started</h1>
					</div>
					<div class="email-content">
						<p>Welcome! Your trial for <strong>${data.orgName}</strong> is now active.</p>
						<div class="kpi">
							<strong>Trial ends:</strong> ${new Date(data.trialEnd).toLocaleString()}
						</div>
						<p>To continue uninterrupted after the trial, add a payment method anytime.</p>
						<p>
							<a class="cta" href="${config.frontendUrl}/billing" target="_blank" rel="noopener noreferrer">Manage Billing</a>
						</p>
					</div>
					<div class="email-footer">
                        <p>Sharkly • Your AI SEO strategist 🔎</p>
					</div>
				</div>
			</body>
			</html>
		`
	},
	trialEndingSoon: {
		subject: (orgName: string) => `Your ${orgName} trial is ending soon`,
		text: (data: TemplateData['trialEndingSoon']) =>
			`Your trial for ${data.orgName} ends in ${data.daysRemaining} days, on ${new Date(data.trialEnd).toLocaleString()}.`,
		html: (data: TemplateData['trialEndingSoon']) => `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Trial Ending Soon</title>
				<style>
					* { margin: 0; padding: 0; box-sizing: border-box; }
					body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; }
					.email-container { max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
                    .email-header { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 36px 28px; border-bottom: 1px solid #bfdbfe; text-align: center; }
                    .email-header h1 { color: #1d4ed8; font-size: 26px; font-weight: 800; }
					.email-content { padding: 32px 28px; }
                    .kpi { background-color: #f9fafb; border-left: 4px solid #60a5fa; border-radius: 8px; padding: 16px; margin: 16px 0; color: #374151; }
                    .cta { display: inline-block; background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 60%, #2563eb 100%); color: #ffffff !important; text-decoration: none; padding: 14px 22px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.3), 0 2px 4px -1px rgba(59,130,246,0.2); margin-top: 18px; }
					.cta:hover { filter: brightness(1.05); }
					.email-footer { background-color: #f9fafb; padding: 22px 28px; text-align: center; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 13px; }
				</style>
			</head>
			<body>
				<div class="email-container">
					<div class="email-header">
						<h1>⏳ Trial ending soon</h1>
					</div>
					<div class="email-content">
						<p>Your trial for <strong>${data.orgName}</strong> ends in <strong>${data.daysRemaining} days</strong>.</p>
						<div class="kpi"><strong>End date:</strong> ${new Date(data.trialEnd).toLocaleString()}</div>
						<p>To keep your account active, add a payment method before your trial ends.</p>
						<p>
							<a class="cta" href="${config.frontendUrl}/billing" target="_blank" rel="noopener noreferrer">Manage Billing</a>
						</p>
					</div>
					<div class="email-footer">
                        <p>Sharkly • Your AI SEO strategist 🔎</p>
					</div>
				</div>
			</body>
			</html>
		`
	},
	trialEndsTomorrow: {
		subject: (orgName: string) => `Your ${orgName} trial ends tomorrow`,
		text: (data: TemplateData['trialEndsTomorrow']) =>
			`Your trial for ${data.orgName} ends tomorrow (${new Date(data.trialEnd).toLocaleString()}).`,
		html: (data: TemplateData['trialEndsTomorrow']) => `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Trial Ends Tomorrow</title>
				<style>
					* { margin: 0; padding: 0; box-sizing: border-box; }
					body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; }
					.email-container { max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
                    .email-header { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 36px 28px; border-bottom: 1px solid #bfdbfe; text-align: center; }
                    .email-header h1 { color: #1d4ed8; font-size: 26px; font-weight: 800; }
					.email-content { padding: 32px 28px; }
                    .kpi { background-color: #f9fafb; border-left: 4px solid #60a5fa; border-radius: 8px; padding: 16px; margin: 16px 0; color: #374151; }
                    .cta { display: inline-block; background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 60%, #2563eb 100%); color: #ffffff !important; text-decoration: none; padding: 14px 22px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.3), 0 2px 4px -1px rgba(59,130,246,0.2); margin-top: 18px; }
					.cta:hover { filter: brightness(1.05); }
					.email-footer { background-color: #f9fafb; padding: 22px 28px; text-align: center; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 13px; }
				</style>
			</head>
			<body>
				<div class="email-container">
					<div class="email-header">
						<h1>⚠️ Trial ends tomorrow</h1>
					</div>
					<div class="email-content">
						<p>Your trial for <strong>${data.orgName}</strong> ends tomorrow.</p>
						<div class="kpi"><strong>End date:</strong> ${new Date(data.trialEnd).toLocaleString()}</div>
						<p>Add a payment method now to avoid interruption.</p>
						<p>
							<a class="cta" href="${config.frontendUrl}/billing" target="_blank" rel="noopener noreferrer">Manage Billing</a>
						</p>
					</div>
					<div class="email-footer">
                        <p>Sharkly • Your AI SEO strategist 🔎</p>
					</div>
				</div>
			</body>
			</html>
		`
	},
	trialEnded: {
		subject: (orgName: string) => `${orgName} trial has ended`,
		text: (data: TemplateData['trialEnded']) =>
			`Your trial for ${data.orgName} has ended. End date: ${new Date(data.trialEnd).toLocaleString()}.`,
		html: (data: TemplateData['trialEnded']) => `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Trial Ended</title>
				<style>
					* { margin: 0; padding: 0; box-sizing: border-box; }
					body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; }
					.email-container { max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
                    .email-header { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 36px 28px; border-bottom: 1px solid #bfdbfe; text-align: center; }
                    .email-header h1 { color: #1d4ed8; font-size: 26px; font-weight: 800; }
					.email-content { padding: 32px 28px; }
                    .kpi { background-color: #f9fafb; border-left: 4px solid #60a5fa; border-radius: 8px; padding: 16px; margin: 16px 0; color: #374151; }
                    .cta { display: inline-block; background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%); color: #ffffff !important; text-decoration: none; padding: 14px 22px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.3), 0 2px 4px -1px rgba(59,130,246,0.2); margin-top: 18px; }
					.cta:hover { filter: brightness(1.05); }
					.email-footer { background-color: #f9fafb; padding: 22px 28px; text-align: center; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 13px; }
				</style>
			</head>
			<body>
				<div class="email-container">
					<div class="email-header">
						<h1>⛔ Your trial has ended</h1>
					</div>
					<div class="email-content">
						<p>Your trial for <strong>${data.orgName}</strong> has ended.</p>
						<div class="kpi"><strong>End date:</strong> ${new Date(data.trialEnd).toLocaleString()}</div>
						<p>Reactivate access by choosing a plan and adding a payment method.</p>
						<p>
							<a class="cta" href="${config.frontendUrl}/billing" target="_blank" rel="noopener noreferrer">Update Subscription</a>
						</p>
					</div>
					<div class="email-footer">
                        <p>Sharkly • Your AI SEO strategist 🔎</p>
					</div>
				</div>
			</body>
			</html>
		`
	}
	// Add more templates here as needed
} as const;

class EmailService {
	private resend: Resend | null = null;
	private isDevMode: boolean;

	constructor() {
		// Send real emails whenever a Resend API key is configured
		this.isDevMode = !config.resend.apiKey;
		if (!this.isDevMode) {
			this.resend = new Resend(config.resend.apiKey);
		}
	}

	async sendEmail(options: EmailOptions): Promise<void> {
		try {
			if (this.isDevMode) {
				// In development mode, just log the email details
				console.log('📧 DEV MODE - Email would be sent:');
				console.log('  From:', options.from || config.resend.from);
				console.log('  Reply-To:', options.replyTo || config.resend.replyTo || config.resend.from);
				console.log('  To:', options.to);
				console.log('  Subject:', options.subject);
				if (options.attachments && options.attachments.length > 0) {
					console.log(
						'  Attachments:',
						options.attachments.map((a) => a.filename)
					);
				}
				console.log('  --- End of email log ---');
				return;
			}

			if (!this.resend) {
				throw new Error('Resend client not configured');
			}

			const from = options.from || config.resend.from;
			const replyTo = options.replyTo || config.resend.replyTo || config.resend.from;

			const attachments = (options.attachments || []).map((a) => ({
				filename: a.filename,
				content: Buffer.from(a.content, 'utf-8')
			}));

			await this.resend.emails.send({
				from,
				to: options.to,
				subject: options.subject,
				text: options.text,
				html: options.html,
				replyTo: replyTo,
				attachments: attachments.length > 0 ? attachments : undefined
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

		// Type-safe subject generation
		let subject: string;
		if (template === 'teamMemberInvite') {
			subject = templateData.subject((data as TemplateData['teamMemberInvite']).orgName);
		} else if (template === 'organizationDeleted') {
			subject = templateData.subject((data as TemplateData['organizationDeleted']).orgName);
		} else if (template === 'trialStarted') {
			subject = templateData.subject((data as TemplateData['trialStarted']).orgName);
		} else if (template === 'trialEndingSoon') {
			subject = templateData.subject((data as TemplateData['trialEndingSoon']).orgName);
		} else if (template === 'trialEndsTomorrow') {
			subject = templateData.subject((data as TemplateData['trialEndsTomorrow']).orgName);
		} else if (template === 'trialEnded') {
			subject = templateData.subject((data as TemplateData['trialEnded']).orgName);
		} else {
			subject = templateData.subject('');
		}

		await this.sendEmail({
			to,
			subject,
			text: templateData.text(data as unknown as never),
			html: templateData.html(data as unknown as never)
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

	async sendTrialStarted(to: string, orgName: string, trialEnd: string): Promise<void> {
		await this.sendTemplateEmail('trialStarted', to, { orgName, trialEnd });
	}

	async sendTrialEndingSoon(
		to: string,
		orgName: string,
		daysRemaining: number,
		trialEnd: string
	): Promise<void> {
		await this.sendTemplateEmail('trialEndingSoon', to, { orgName, daysRemaining, trialEnd });
	}

	async sendTrialEndsTomorrow(to: string, orgName: string, trialEnd: string): Promise<void> {
		await this.sendTemplateEmail('trialEndsTomorrow', to, { orgName, trialEnd });
	}

	async sendTrialEnded(to: string, orgName: string, trialEnd: string): Promise<void> {
		await this.sendTemplateEmail('trialEnded', to, { orgName, trialEnd });
	}
}

export const emailService = new EmailService();
