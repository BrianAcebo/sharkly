import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { AnimatedText } from '../components/AnimatedText';
import { resolveColor, type SceneProps } from '../types';

const ITEM_FRAMES = 12;

export const Checklist: React.FC<SceneProps> = ({ scene, brand }) => {
	const frame = useCurrentFrame();
	const content = scene.content as { heading?: string; items?: string[] };
	const heading = String(content.heading ?? '');
	const items = Array.isArray(content.items) ? content.items.map(String) : [];
	const accentHex = resolveColor(scene.accent_color, brand);
	const start = 18;

	return (
		<AbsoluteFill
			style={{
				flexDirection: 'column',
				padding: '72px 72px',
				justifyContent: 'center',
			}}
		>
			<AnimatedText
				animationStyle="fade_up"
				style={{
					fontFamily: brand.fonts.heading,
					fontSize: 48,
					fontWeight: 800,
					color: accentHex,
					marginBottom: 40,
				}}
			>
				{heading}
			</AnimatedText>

			<div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
				{items.map((item, i) => {
					const base = start + i * ITEM_FRAMES * 3;
					const borderF = Math.max(0, frame - base);
					const borderOpacity = interpolate(borderF, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
					const textF = Math.max(0, frame - (base + 8));
					const textOpacity = interpolate(textF, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
					const textX = interpolate(textF, [0, 10], [16, 0], { extrapolateRight: 'clamp' });
					const checkF = Math.max(0, frame - (base + 18));
					const checkOpacity = interpolate(checkF, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
					const fillProgress = interpolate(checkF, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

					return (
						<div
							key={i}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 20,
							}}
						>
							<div
								style={{
									width: 28,
									height: 28,
									border: `2px solid ${accentHex}`,
									borderRadius: 4,
									opacity: borderOpacity,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									backgroundColor: `rgba(255,255,255,${0.15 * fillProgress})`,
									flexShrink: 0,
								}}
							>
								<span
									style={{
										color: accentHex,
										fontSize: 18,
										fontWeight: 800,
										opacity: checkOpacity,
									}}
								>
									✓
								</span>
							</div>
							<span
								style={{
									fontFamily: brand.fonts.body,
									fontSize: 32,
									color: brand.colors.primaryText,
									opacity: textOpacity,
									transform: `translateX(${textX}px)`,
									lineHeight: 1.35,
								}}
							>
								{item}
							</span>
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
