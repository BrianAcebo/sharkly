import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { AnimatedText } from '../components/AnimatedText';
import { resolveColor, type SceneProps } from '../types';

export const StatCallout: React.FC<SceneProps> = ({ scene, brand }) => {
	const frame = useCurrentFrame();
	const content = scene.content as { stat?: string; label?: string; context?: string };
	const stat = String(content.stat ?? '');
	const label = String(content.label ?? '');
	const context = String(content.context ?? '');
	const accentHex = resolveColor(scene.accent_color, brand);

	const circleScale = interpolate(frame, [0, 20], [0, 1], {
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.back(1.5)),
	});
	const statScale = interpolate(frame, [8, 24], [0.5, 1], {
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.back(2)),
	});
	const statOpacity = interpolate(frame, [6, 18], [0, 1], { extrapolateRight: 'clamp' });

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				flexDirection: 'column',
			}}
		>
			<AnimatedText
				animationStyle="fade_in"
				style={{
					fontFamily: brand.fonts.body,
					fontSize: 22,
					letterSpacing: '6px',
					textTransform: 'uppercase',
					color: brand.colors.muted,
					marginBottom: 40,
				}}
			>
				{label}
			</AnimatedText>

			<div
				style={{
					position: 'relative',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<div
					style={{
						position: 'absolute',
						width: 400,
						height: 400,
						borderRadius: '50%',
						backgroundColor: accentHex,
						opacity: 0.1,
						transform: `scale(${circleScale})`,
					}}
				/>
				<div
					style={{
						fontFamily: brand.fonts.heading,
						fontSize: 160,
						fontWeight: 900,
						color: accentHex,
						opacity: statOpacity,
						transform: `scale(${statScale})`,
						lineHeight: 1,
					}}
				>
					{stat}
				</div>
			</div>

			<AnimatedText
				animationStyle="fade_up"
				delay={28}
				style={{
					fontFamily: brand.fonts.body,
					fontSize: 32,
					color: brand.colors.muted,
					textAlign: 'center',
					marginTop: 40,
					maxWidth: 800,
				}}
			>
				{context}
			</AnimatedText>
		</AbsoluteFill>
	);
};
