import {
	Body,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Text
} from '@react-email/components';
import * as React from 'react';
import { getAppOrigin } from '../../config.js';

/** Oceanic theme — non-signup / simple layout */
const oceanic = {
	primary: '#0891b2',
	primaryDark: '#0e7490',
	shark: '#0a2540',
	bgTint: '#ecfeff',
	border: '#a5f3fc',
	muted: '#52525b'
};

export type SharklyEmailProps = {
	previewText: string;
	heading: string;
	children: React.ReactNode;
	brandName?: string;
	showLogo?: boolean;
	/**
	 * `rich` = Canva signup template (black header, hero, pill CTA, dark footer).
	 * `default` = compact oceanic card (other auth emails + notifications).
	 */
	variant?: 'default' | 'rich';
};

const mainDefault = {
	backgroundColor: oceanic.bgTint,
	fontFamily:
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif"
};

const mainRich = {
	backgroundColor: '#f0f1f5',
	fontFamily: 'Arial, Helvetica, sans-serif'
};

const card = {
	backgroundColor: '#ffffff',
	borderRadius: '16px',
	padding: '0',
	border: `1px solid ${oceanic.border}`,
	boxShadow: '0 4px 24px rgba(8, 145, 178, 0.08)',
	overflow: 'hidden' as const
};

const h1 = {
	color: oceanic.shark,
	fontSize: '24px',
	fontWeight: '700',
	lineHeight: '1.25',
	margin: '0 0 20px',
	letterSpacing: '-0.02em'
};

const footerDefault = {
	color: oceanic.muted,
	fontSize: '12px',
	lineHeight: '1.65',
	margin: '0'
};

const footerBrand = {
	color: oceanic.shark,
	fontWeight: '600'
};

/** Supabase Storage public bucket — absolute URLs so images load in real inboxes (not localhost). */
export const richTemplateAssets = {
	logoPng: 'https://api.sharkly.co/storage/v1/object/public/emails/96b9c2eaa08f911265b15da55f01ded3.png',
	heroJpg: 'https://api.sharkly.co/storage/v1/object/public/emails/116945c8db0f9f6cb7833b61a1e0766e.jpg',
} as const;

export function SharklyEmail({
	previewText,
	heading,
	children,
	brandName = 'Sharkly',
	showLogo = true,
	variant = 'default'
}: SharklyEmailProps) {
	const appOrigin = getAppOrigin();
	const logoSvg = `${appOrigin}/images/logos/logo.svg`;
	const useRich = variant === 'rich' && showLogo;

	if (useRich) {
		return (
			<Html lang="en">
				<Head />
				<Preview>{previewText}</Preview>
				<Body style={mainRich}>
					<Container style={{ margin: '0 auto', padding: '10px 0 24px', maxWidth: '600px' }}>
						<Section style={{ backgroundColor: '#eff0f0', padding: '0' }}>
							<Section style={{ padding: '0 20px' }}>
								{/* Black header + logo (PNG from template) */}
								<Section
									style={{
										backgroundColor: '#000000',
										borderRadius: '20px',
										textAlign: 'center',
										padding: '16px 20px'
									}}
								>
									<Link href="https://sharkly.co" style={{ textDecoration: 'none' }}>
										<Img
											src={richTemplateAssets.logoPng}
											alt={brandName}
											width={145}
											height={48}
											style={{ display: 'block', margin: '0 auto', border: '0' }}
										/>
									</Link>
								</Section>
								{/* Hero */}
								<Section style={{ textAlign: 'center', padding: '16px 0 0' }}>
									<Img
										src={richTemplateAssets.heroJpg}
										alt=""
										width={499}
										style={{
											display: 'block',
											width: '100%',
											maxWidth: '499px',
											height: 'auto',
											margin: '0 auto'
										}}
									/>
								</Section>
								{heading ? (
									<Heading
										as="h1"
										style={{
											color: '#0e1b10',
											fontSize: '22px',
											fontWeight: '700',
											textAlign: 'center',
											margin: '16px 0 12px',
											lineHeight: '1.3'
										}}
									>
										{heading}
									</Heading>
								) : null}
								{children}
								{/* Dark footer — matches templates/auth/email.html */}
								<Section
									style={{
										backgroundColor: '#000000',
										borderRadius: '20px',
										padding: '13px',
										marginTop: '24px'
									}}
								>
									<Text
										style={{ margin: '0', color: '#ffffff', fontSize: '16px', lineHeight: '1.2' }}
									>
										<span style={{ fontSize: '18.67px' }}>Need help? </span>
										Email us at{' '}
										<Link
											href="mailto:hello@sharkly.co"
											style={{ color: '#ffffff', textDecoration: 'none' }}
										>
											hello@sharkly.co
										</Link>
									</Text>
									<Text
										style={{
											margin: '16px 0 0',
											color: '#ffffff',
											fontSize: '13.33px',
											lineHeight: '1.625'
										}}
									>
										SEO made simple for small businesses. Topic strategy, content clusters, and
										keyword research — all automated.
									</Text>
									<Text
										style={{
											margin: '16px 0 0',
											color: '#bfc3c8',
											fontSize: '14px',
											lineHeight: '1.15'
										}}
									>
										© {new Date().getFullYear()} Sharkly, LLC. SEO made simple for small businesses.
									</Text>
								</Section>
							</Section>
						</Section>
					</Container>
				</Body>
			</Html>
		);
	}

	const logoSrc = logoSvg;

	return (
		<Html lang="en">
			<Head />
			<Preview>{previewText}</Preview>
			<Body style={mainDefault}>
				<Container style={{ margin: '0 auto', padding: '40px 16px 56px', maxWidth: '560px' }}>
					<Section style={card}>
						{showLogo ? (
							<Section
								style={{
									backgroundColor: '#ffffff',
									padding: '28px 28px 8px',
									textAlign: 'center'
								}}
							>
								<Link href="https://sharkly.co" style={{ textDecoration: 'none' }}>
									<Img
										src={logoSrc}
										alt={brandName}
										width={176}
										height={56}
										style={{ margin: '0 auto', display: 'block', height: 'auto' }}
									/>
								</Link>
							</Section>
						) : null}
						<Section style={{ padding: '8px 28px 32px' }}>
							<Heading style={h1}>{heading}</Heading>
							{children}
							<Hr style={{ borderColor: '#e4e4e7', margin: '28px 0' }} />
							<Text style={footerDefault}>
								<span style={footerBrand}>{brandName}</span> — SEO made simple for small businesses.
								<br />
								<Link href="https://sharkly.co" style={{ color: oceanic.primaryDark }}>
									sharkly.co
								</Link>
								{' · '}
								<Link href={`${appOrigin}`} style={{ color: oceanic.primaryDark }}>
									Open app
								</Link>
								<br />
								<br />
								If you didn&apos;t request this email, you can safely ignore it.
							</Text>
						</Section>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

const buttonDefault = {
	backgroundColor: oceanic.primary,
	borderRadius: '10px',
	color: '#ffffff',
	display: 'inline-block',
	fontSize: '15px',
	fontWeight: '600',
	lineHeight: '1',
	padding: '14px 32px',
	textDecoration: 'none',
	textAlign: 'center' as const
};

const buttonRich = {
	backgroundColor: '#000000',
	borderRadius: '100px',
	color: '#eff0f0',
	display: 'inline-block',
	fontSize: '18.67px',
	fontWeight: '700',
	lineHeight: '53px',
	height: '53px',
	padding: '0 32px',
	textDecoration: 'none',
	textAlign: 'center' as const
};

const p = {
	color: '#3f3f46',
	fontSize: '15px',
	lineHeight: '1.6',
	margin: '0 0 16px'
};

/** Body copy — matches `templates/auth/email.html` hero text */
export const textStyleRichCenter = {
	color: '#0e1b10',
	fontSize: '14.67px',
	lineHeight: '1.4',
	textAlign: 'center' as const,
	margin: '16px 0'
};

export function PrimaryButton({
	href,
	label,
	variant = 'default'
}: {
	href: string;
	label: string;
	variant?: 'default' | 'rich';
}) {
	const style = variant === 'rich' ? buttonRich : buttonDefault;
	return (
		<Section style={{ textAlign: 'center', margin: variant === 'rich' ? '16px 0 24px' : '24px 0' }}>
			<Link href={href} style={style}>
				{label}
			</Link>
		</Section>
	);
}

export { p as textStyle };
