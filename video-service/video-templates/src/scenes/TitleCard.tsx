import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AccentBar } from '../components/AccentBar';
import { AnimatedText } from '../components/AnimatedText';
import { mapAnimatedTextStyle } from '../lib/mapAnimatedTextStyle';
import { resolveColor, type SceneProps } from '../types';

export const TitleCard: React.FC<SceneProps> = ({ scene, brand }) => {
	const content = scene.content as { heading?: string; subheading?: string };
	const heading = String(content.heading ?? '');
	const subheading = content.subheading ? String(content.subheading) : undefined;
	const accentHex = resolveColor(scene.accent_color, brand);

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'flex-start',
				flexDirection: 'column',
				padding: '0 80px',
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: 60,
					left: 60,
					width: 10,
					height: 10,
					borderRadius: '50%',
					backgroundColor: accentHex,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					bottom: 60,
					right: 60,
					width: 10,
					height: 10,
					borderRadius: '50%',
					backgroundColor: accentHex,
				}}
			/>

			<AccentBar color={accentHex} width={120} height={4} style={{ marginBottom: 28 }} />

			<AnimatedText
				animationStyle={mapAnimatedTextStyle(scene.animation_style)}
				style={{
					fontFamily: brand.fonts.heading,
					fontSize: 72,
					fontWeight: 800,
					color: brand.colors.primaryText,
					lineHeight: 1.1,
					marginBottom: 24,
				}}
			>
				{heading}
			</AnimatedText>

			{subheading && (
				<AnimatedText
					animationStyle="fade_in"
					delay={18}
					style={{
						fontFamily: brand.fonts.body,
						fontSize: 36,
						color: brand.colors.muted,
					}}
				>
					{subheading}
				</AnimatedText>
			)}
		</AbsoluteFill>
	);
};
