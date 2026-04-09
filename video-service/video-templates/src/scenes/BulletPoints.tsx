import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { AccentBar } from '../components/AccentBar';
import { AnimatedText } from '../components/AnimatedText';
import { SideRule } from '../components/SideRule';
import { resolveColor, type SceneProps } from '../types';

export const BulletPoints: React.FC<SceneProps> = ({ scene, brand }) => {
	const frame = useCurrentFrame();
	const content = scene.content as { heading?: string; bullets?: string[] };
	const heading = String(content.heading ?? '');
	const bullets = Array.isArray(content.bullets) ? content.bullets.map(String) : [];
	const emphasis = new Set<number>(scene.emphasis_indices ?? []);
	const accentHex = resolveColor(scene.accent_color, brand);

	const BULLET_DELAY = 10;
	const HEADING_FRAMES = 20;

	return (
		<AbsoluteFill
			style={{
				flexDirection: 'column',
				padding: '80px 80px',
				justifyContent: 'center',
			}}
		>
			<AnimatedText
				animationStyle="fade_up"
				style={{
					fontFamily: brand.fonts.heading,
					fontSize: 52,
					fontWeight: 800,
					color: accentHex,
					marginBottom: 12,
				}}
			>
				{heading}
			</AnimatedText>
			<AccentBar color={accentHex} width={160} height={3} delay={12} style={{ marginBottom: 48 }} />

			<div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
				<SideRule color={accentHex} style={{ height: Math.max(120, bullets.length * 72), flexShrink: 0 }} />

				<div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
					{bullets.map((bullet, i) => {
						const delay = HEADING_FRAMES + i * BULLET_DELAY;
						const f = Math.max(0, frame - delay);
						const opacity = interpolate(f, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
						const translateX = interpolate(f, [0, 12], [20, 0], { extrapolateRight: 'clamp' });
						const isEmphasis = emphasis.has(i);
						const bulletColor = isEmphasis ? accentHex : brand.colors.primaryText;
						const markerColor = isEmphasis ? accentHex : brand.colors.muted;

						return (
							<div
								key={i}
								style={{
									opacity,
									transform: `translateX(${translateX}px)`,
									display: 'flex',
									alignItems: 'center',
									gap: 16,
								}}
							>
								<div
									style={{ width: 10, height: 10, backgroundColor: markerColor, flexShrink: 0 }}
								/>
								<span
									style={{
										fontFamily: brand.fonts.body,
										fontSize: 34,
										color: bulletColor,
										fontWeight: isEmphasis ? 700 : 400,
										lineHeight: 1.3,
									}}
								>
									{bullet}
								</span>
							</div>
						);
					})}
				</div>
			</div>
		</AbsoluteFill>
	);
};
