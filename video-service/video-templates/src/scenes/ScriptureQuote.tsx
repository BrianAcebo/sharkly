import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AccentBar } from '../components/AccentBar';
import { AnimatedText } from '../components/AnimatedText';
import { mapAnimatedTextStyle } from '../lib/mapAnimatedTextStyle';
import type { SceneProps } from '../types';

export const ScriptureQuote: React.FC<SceneProps> = ({ scene, brand }) => {
	const content = scene.content as { verse?: string; reference?: string };
	const verse = String(content.verse ?? '');
	const reference = String(content.reference ?? '');
	const gold = brand.colors.gold;

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				flexDirection: 'column',
				padding: '0 80px',
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: 120,
					left: 60,
					fontSize: 320,
					color: gold,
					opacity: 0.06,
					fontFamily: brand.fonts.heading,
					lineHeight: 1,
					userSelect: 'none',
				}}
			>
				❝
			</div>

			<AccentBar color={gold} height={2} style={{ marginBottom: 4 }} />
			<AccentBar color={gold} height={2} delay={6} style={{ marginBottom: 48 }} />

			<AnimatedText
				animationStyle={mapAnimatedTextStyle(scene.animation_style)}
				delay={16}
				style={{
					fontFamily: brand.fonts.heading,
					fontSize: 44,
					color: gold,
					textAlign: 'center',
					lineHeight: 1.5,
					fontStyle: 'italic',
					marginBottom: 48,
				}}
			>
				"{verse}"
			</AnimatedText>

			<AnimatedText
				animationStyle="fade_in"
				delay={30}
				style={{
					fontFamily: brand.fonts.body,
					fontSize: 28,
					color: brand.colors.muted,
				}}
			>
				— {reference}
			</AnimatedText>

			<AccentBar color={gold} height={2} delay={36} style={{ marginTop: 48, marginBottom: 4 }} />
			<AccentBar color={gold} height={2} delay={42} />
		</AbsoluteFill>
	);
};
