import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AccentBar } from '../components/AccentBar';
import { AnimatedText } from '../components/AnimatedText';
import { mapAnimatedTextStyle } from '../lib/mapAnimatedTextStyle';
import { resolveColor, type SceneProps } from '../types';

export const QuoteCard: React.FC<SceneProps> = ({ scene, brand }) => {
	const content = scene.content as { quote?: string; attribution?: string };
	const quote = String(content.quote ?? '');
	const attribution = content.attribution ? String(content.attribution) : undefined;
	const accentHex = resolveColor(scene.accent_color, brand);
	const pause = scene.animation_style === 'dramatic_pause' ? 15 : 0;

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'flex-start',
				flexDirection: 'column',
				padding: '0 72px',
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: 100,
					left: 48,
					fontSize: 220,
					color: accentHex,
					opacity: 0.08,
					fontFamily: brand.fonts.heading,
					lineHeight: 1,
					userSelect: 'none',
				}}
			>
				❝
			</div>

			<AccentBar color={accentHex} width={100} height={3} delay={pause} style={{ marginBottom: 28 }} />

			<AnimatedText
				animationStyle={mapAnimatedTextStyle(scene.animation_style)}
				delay={10 + pause}
				style={{
					fontFamily: brand.fonts.heading,
					fontSize: 44,
					fontWeight: 700,
					color: brand.colors.primaryText,
					lineHeight: 1.35,
					marginBottom: attribution ? 28 : 0,
				}}
			>
				{quote}
			</AnimatedText>

			{attribution && (
				<>
					<AccentBar color={accentHex} width={80} height={2} delay={22 + pause} style={{ marginBottom: 12 }} />
					<AnimatedText
						animationStyle="fade_in"
						delay={28 + pause}
						style={{
							fontFamily: brand.fonts.body,
							fontSize: 26,
							color: brand.colors.muted,
						}}
					>
						— {attribution}
					</AnimatedText>
				</>
			)}
		</AbsoluteFill>
	);
};
