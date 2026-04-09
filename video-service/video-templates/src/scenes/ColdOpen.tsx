import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { AnimatedText } from '../components/AnimatedText';
import { resolveColor, type SceneProps } from '../types';

export const ColdOpen: React.FC<SceneProps> = ({ scene, brand }) => {
	const frame = useCurrentFrame();
	const content = scene.content as { heading?: string; subheading?: string };
	const heading = String(content.heading ?? '');
	const subheading = content.subheading ? String(content.subheading) : undefined;
	const accentHex = resolveColor(scene.accent_color, brand);

	const rectX = interpolate(frame, [0, 18], [-1100, 0], {
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.exp),
	});
	const headingScale = interpolate(frame, [8, 18], [1.06, 1], {
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.back(1.5)),
	});
	const headingOpacity = interpolate(frame, [6, 14], [0, 1], { extrapolateRight: 'clamp' });

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				flexDirection: 'column',
				padding: '0 60px',
			}}
		>
			<div
				style={{
					transform: `translateX(${rectX}px)`,
					backgroundColor: accentHex,
					width: '100%',
					padding: '28px 48px',
					marginBottom: 32,
				}}
			>
				<div
					style={{
						opacity: headingOpacity,
						transform: `scale(${headingScale})`,
						fontFamily: brand.fonts.heading,
						fontSize: 88,
						fontWeight: 900,
						color: '#ffffff',
						lineHeight: 1.05,
						letterSpacing: '-2px',
						textTransform: 'uppercase',
					}}
				>
					{heading}
				</div>
			</div>

			{subheading && (
				<AnimatedText
					animationStyle="fade_up"
					delay={20}
					style={{
						fontFamily: brand.fonts.body,
						fontSize: 38,
						color: brand.colors.muted,
						textAlign: 'center',
					}}
				>
					{subheading}
				</AnimatedText>
			)}
		</AbsoluteFill>
	);
};
