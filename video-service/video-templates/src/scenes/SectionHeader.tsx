import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AccentBar } from '../components/AccentBar';
import { AnimatedText } from '../components/AnimatedText';
import { resolveColor, type SceneProps } from '../types';

export const SectionHeader: React.FC<SceneProps> = ({ scene, brand }) => {
	const content = scene.content as { heading?: string; label?: string };
	const heading = String(content.heading ?? '');
	const label = content.label ? String(content.label) : undefined;
	const accentHex = resolveColor(scene.accent_color, brand);

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				flexDirection: 'column',
				padding: '0 80px',
			}}
		>
			{label && (
				<AnimatedText
					animationStyle="fade_in"
					style={{
						fontFamily: brand.fonts.body,
						fontSize: 24,
						letterSpacing: '4px',
						textTransform: 'uppercase',
						color: brand.colors.muted,
						marginBottom: 16,
					}}
				>
					{label}
				</AnimatedText>
			)}

			<AccentBar color={accentHex} height={2} delay={8} style={{ marginBottom: 32 }} />

			<AnimatedText
				animationStyle="slide_up"
				delay={18}
				style={{
					fontFamily: brand.fonts.heading,
					fontSize: 64,
					fontWeight: 800,
					color: brand.colors.primaryText,
					lineHeight: 1.15,
				}}
			>
				{heading}
			</AnimatedText>
		</AbsoluteFill>
	);
};
