import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import type { SceneProps } from '../types';

export const MythVsReality: React.FC<SceneProps> = ({ scene, brand, fps }) => {
	const frame = useCurrentFrame();
	const content = scene.content as { myth?: string; reality?: string };
	const myth = String(content.myth ?? '');
	const reality = String(content.reality ?? '');
	const totalFrames = Math.max(1, scene.duration_seconds * fps);
	const midpoint = Math.floor(totalFrames * 0.5);

	const mythOpacity = interpolate(frame, [midpoint - 8, midpoint], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const realityOpacity = interpolate(frame, [midpoint, midpoint + 12], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				padding: '0 60px',
			}}
		>
			<div style={{ position: 'absolute', opacity: mythOpacity, width: '100%', padding: '0 60px' }}>
				<div
					style={{
						fontSize: 22,
						letterSpacing: '4px',
						color: '#ef4444',
						fontFamily: brand.fonts.body,
						marginBottom: 24,
						textTransform: 'uppercase',
					}}
				>
					✗ MYTH
				</div>
				<div
					style={{
						border: '2px solid #ef4444',
						padding: '48px',
						fontFamily: brand.fonts.heading,
						fontSize: 52,
						color: brand.colors.primaryText,
						lineHeight: 1.3,
					}}
				>
					{myth}
				</div>
			</div>

			<div style={{ position: 'absolute', opacity: realityOpacity, width: '100%', padding: '0 60px' }}>
				<div
					style={{
						fontSize: 22,
						letterSpacing: '4px',
						color: brand.colors.accent,
						fontFamily: brand.fonts.body,
						marginBottom: 24,
						textTransform: 'uppercase',
					}}
				>
					✓ REALITY
				</div>
				<div
					style={{
						border: `2px solid ${brand.colors.accent}`,
						backgroundColor: `${brand.colors.accent}18`,
						padding: '48px',
						fontFamily: brand.fonts.heading,
						fontSize: 52,
						color: brand.colors.primaryText,
						lineHeight: 1.3,
					}}
				>
					{reality}
				</div>
			</div>
		</AbsoluteFill>
	);
};
