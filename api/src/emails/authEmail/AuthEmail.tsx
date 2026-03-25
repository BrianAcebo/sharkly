import { Text } from '@react-email/components';
import * as React from 'react';
import { PrimaryButton, SharklyEmail, textStyle, textStyleRichCenter } from './SharklyEmail.js';

export type AuthEmailProps = {
	emailActionType: string;
	confirmationUrl: string | null;
	userEmail: string;
};

function subjectAndCopy(action: string): { preview: string; heading: string; button?: string } {
	switch (action) {
		case 'signup':
			return {
				preview: 'Confirm your email to access your new Sharkly account',
				heading: '',
				button: 'Confirm Email'
			};
		case 'invite':
			return {
				preview: "You've been invited to Sharkly",
				heading: 'Accept your invitation',
				button: 'Accept invitation'
			};
		case 'magiclink':
			return {
				preview: 'Your Sharkly sign-in link',
				heading: 'Sign in to Sharkly',
				button: 'Sign in'
			};
		case 'recovery':
			return {
				preview: 'Reset your Sharkly password',
				heading: 'Reset your password',
				button: 'Reset password'
			};
		case 'email_change':
			return {
				preview: 'Confirm your email change',
				heading: 'Confirm your email change',
				button: 'Confirm change'
			};
		case 'email':
			return {
				preview: 'Continue to Sharkly',
				heading: 'Verification',
				button: 'Continue'
			};
		case 'reauthentication':
			return {
				preview: 'Confirm it’s you',
				heading: 'Confirm reauthentication',
				button: 'Confirm'
			};
		case 'password_changed_notification':
			return {
				preview: 'Your Sharkly password was changed',
				heading: 'Password changed'
			};
		case 'email_changed_notification':
			return {
				preview: 'Your Sharkly email was changed',
				heading: 'Email address changed'
			};
		case 'phone_changed_notification':
			return {
				preview: 'Your Sharkly phone number was changed',
				heading: 'Phone number changed'
			};
		case 'identity_linked_notification':
			return {
				preview: 'A new sign-in method was linked',
				heading: 'Identity linked'
			};
		case 'identity_unlinked_notification':
			return {
				preview: 'A sign-in method was removed',
				heading: 'Identity unlinked'
			};
		case 'mfa_factor_enrolled_notification':
			return {
				preview: 'New MFA method added',
				heading: 'MFA method enrolled'
			};
		case 'mfa_factor_unenrolled_notification':
			return {
				preview: 'MFA method removed',
				heading: 'MFA method removed'
			};
		default:
			return {
				preview: 'Notification from Sharkly',
				heading: 'Sharkly notification',
				button: 'Open link'
			};
	}
}

export function AuthEmail({ emailActionType, confirmationUrl, userEmail }: AuthEmailProps) {
	const { preview, heading, button } = subjectAndCopy(emailActionType);

	const notificationBody = () => {
		switch (emailActionType) {
			case 'password_changed_notification':
				return (
					<Text style={textStyle}>
						The password for your account ({userEmail}) was just changed. If this wasn&apos;t you,
						contact support immediately at hello@sharkly.co.
					</Text>
				);
			case 'email_changed_notification':
				return (
					<Text style={textStyle}>
						The email address for your account was updated. If you didn&apos;t make this change,
						contact hello@sharkly.co.
					</Text>
				);
			case 'phone_changed_notification':
				return (
					<Text style={textStyle}>
						The phone number on your account was updated. If you didn&apos;t make this change,
						contact hello@sharkly.co.
					</Text>
				);
			case 'identity_linked_notification':
				return (
					<Text style={textStyle}>
						A new sign-in method was linked to your account ({userEmail}). If this wasn&apos;t you,
						contact hello@sharkly.co.
					</Text>
				);
			case 'identity_unlinked_notification':
				return (
					<Text style={textStyle}>
						A sign-in method was removed from your account. If you didn&apos;t make this change,
						contact hello@sharkly.co.
					</Text>
				);
			case 'mfa_factor_enrolled_notification':
				return (
					<Text style={textStyle}>
						A new multi-factor authentication method was added to your account. If you didn&apos;t
						make this change, contact hello@sharkly.co.
					</Text>
				);
			case 'mfa_factor_unenrolled_notification':
				return (
					<Text style={textStyle}>
						An MFA method was removed from your account. If you didn&apos;t make this change,
						contact hello@sharkly.co.
					</Text>
				);
			default:
				return null;
		}
	};

	if (
		[
			'password_changed_notification',
			'email_changed_notification',
			'phone_changed_notification',
			'identity_linked_notification',
			'identity_unlinked_notification',
			'mfa_factor_enrolled_notification',
			'mfa_factor_unenrolled_notification'
		].includes(emailActionType)
	) {
		return (
			<SharklyEmail previewText={preview} heading={heading} showLogo={false}>
				{notificationBody()}
			</SharklyEmail>
		);
	}

	if (emailActionType === 'signup') {
		return (
			<SharklyEmail previewText={preview} heading={heading} variant="rich">
				<Text style={textStyleRichCenter}>
					You&apos;re just one click away from accessing your new Sharkly account. Click the button
					below to verify your email address and get started.
				</Text>
				{confirmationUrl && button ? (
					<PrimaryButton href={confirmationUrl} label={button} variant="rich" />
				) : null}
			</SharklyEmail>
		);
	}

	return (
		<SharklyEmail previewText={preview} heading={heading}>
			<>
				<Text style={textStyle}>Hello,</Text>
				<Text style={textStyle}>
					{emailActionType === 'invite' && 'You’ve been invited to join a team on Sharkly.'}
					{emailActionType === 'magiclink' &&
						'Use the button below to sign in. This link expires soon.'}
					{emailActionType === 'recovery' && 'We received a request to reset your password.'}
					{emailActionType === 'email_change' && 'Confirm this email change to update your login.'}
					{emailActionType === 'email' && 'Use the button below to continue.'}
					{emailActionType === 'reauthentication' &&
						'For your security, confirm this action using the link below.'}
					{![
						'invite',
						'magiclink',
						'recovery',
						'email_change',
						'email',
						'reauthentication'
					].includes(emailActionType) && 'Use the link below to continue.'}
				</Text>
			</>
			{confirmationUrl && button ? <PrimaryButton href={confirmationUrl} label={button} /> : null}
		</SharklyEmail>
	);
}

const subjects: Record<string, string> = {
	signup: 'Welcome to Sharkly — confirm your email',
	invite: "You're invited to Sharkly",
	magiclink: 'Your Sharkly sign-in link',
	recovery: 'Reset your Sharkly password',
	email_change: 'Confirm your Sharkly email change',
	email: 'Continue to Sharkly',
	reauthentication: 'Confirm your Sharkly login',
	password_changed_notification: 'Your Sharkly password was changed',
	email_changed_notification: 'Your Sharkly email was updated',
	phone_changed_notification: 'Your Sharkly phone number was updated',
	identity_linked_notification: 'New sign-in method linked to Sharkly',
	identity_unlinked_notification: 'Sign-in method removed from Sharkly',
	mfa_factor_enrolled_notification: 'New MFA method on your Sharkly account',
	mfa_factor_unenrolled_notification: 'MFA method removed from Sharkly'
};

export function emailSubjectForAction(emailActionType: string): string {
	return subjects[emailActionType] ?? 'Sharkly notification';
}
