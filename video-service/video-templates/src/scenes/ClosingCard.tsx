import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AccentBar } from '../components/AccentBar';
import { AnimatedText } from '../components/AnimatedText';
import { resolveColor, type SceneProps } from '../types';

export const ClosingCard: React.FC<SceneProps> = ({ scene, brand }) => {
	const content = scene.content as { heading?: string; cta?: string; url?: string };
	const heading = String(content.heading ?? '');
	const cta = content.cta ? String(content.cta) : undefined;
	const url = content.url ? String(content.url) : undefined;
	const accentHex = resolveColor(scene.accent_color, brand);

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				flexDirection: 'column',
				padding: '0 64px',
			}}
		>
			<AccentBar color={accentHex} width="100%" height={4} style={{ marginBottom: 40 }} />

			<AnimatedText
				animationStyle="fade_up"
				delay={12}
				style={{
					fontFamily: brand.fonts.heading,
					fontSize: 56,
					fontWeight: 800,
					color: brand.colors.primaryText,
					textAlign: 'center',
					lineHeight: 1.15,
					marginBottom: 36,
				}}
			>
				{heading}
			</AnimatedText>

			{cta && (
				<AnimatedText
					animationStyle="fade_in"
					delay={22}
					style={{
						border: `2px solid ${accentHex}`,
						borderRadius: 12,
						padding: '20px 36px',
						fontFamily: brand.fonts.body,
						fontSize: 30,
						fontWeight: 600,
						color: accentHex,
					}}
				>
					{cta}
				</AnimatedText>
			)}

			{url && (
				<AnimatedText
					animationStyle="fade_in"
					delay={cta ? 36 : 22}
					style={{
						marginTop: 24,
						fontFamily: brand.fonts.body,
						fontSize: 24,
						color: brand.colors.muted,
						textAlign: 'center',
					}}
				>
					{url}
				</AnimatedText>
			)}
		</AbsoluteFill>
	);
};
