import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { AnimatedText } from '../components/AnimatedText';
import { resolveColor, type SceneProps } from '../types';

export const EvidenceStack: React.FC<SceneProps> = ({ scene, brand }) => {
	const frame = useCurrentFrame();
	const content = scene.content as {
		heading?: string;
		points?: Array<{ number: string; title: string; detail: string }>;
	};
	const heading = String(content.heading ?? '');
	const points = Array.isArray(content.points) ? content.points : [];
	const accentHex = resolveColor(scene.accent_color, brand);

	return (
		<AbsoluteFill style={{ padding: '56px 48px' }}>
			<AnimatedText
				animationStyle="fade_up"
				style={{
					fontFamily: brand.fonts.heading,
					fontSize: 44,
					fontWeight: 800,
					color: accentHex,
					marginBottom: 36,
				}}
			>
				{heading}
			</AnimatedText>

			<div style={{ position: 'relative', minHeight: 600, width: '100%' }}>
				{points.map((p, i) => {
					const delay = 14 + i * 20;
					const f = Math.max(0, frame - delay);
					const x = interpolate(f, [0, 18], [100, 0], { extrapolateRight: 'clamp' });
					const opacity = interpolate(f, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
					const scale = interpolate(f, [0, 18], [0.94 - i * 0.02, 1 - i * 0.015], {
						extrapolateRight: 'clamp',
					});
					const top = 40 + i * 96;

					return (
						<div
							key={`${p.number}-${i}`}
							style={{
								position: 'absolute',
								left: 0,
								right: 0,
								top,
								padding: '20px 24px',
								borderRadius: 12,
								border: `2px solid ${brand.colors.muted}`,
								backgroundColor: 'rgba(255,255,255,0.04)',
								transform: `translateX(${x}px) scale(${scale})`,
								opacity,
								zIndex: 10 + i,
								boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
							}}
						>
							<div
								style={{
									fontFamily: brand.fonts.body,
									fontSize: 18,
									color: accentHex,
									fontWeight: 700,
									marginBottom: 8,
								}}
							>
								{p.number}
							</div>
							<div
								style={{
									fontFamily: brand.fonts.heading,
									fontSize: 28,
									color: brand.colors.primaryText,
									marginBottom: 8,
								}}
							>
								{p.title}
							</div>
							<div style={{ fontFamily: brand.fonts.body, fontSize: 24, color: brand.colors.muted, lineHeight: 1.4 }}>
								{p.detail}
							</div>
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
