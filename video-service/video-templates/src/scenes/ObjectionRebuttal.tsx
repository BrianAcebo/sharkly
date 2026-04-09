import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { resolveColor, type SceneProps } from '../types';

export const ObjectionRebuttal: React.FC<SceneProps> = ({ scene, brand, fps }) => {
	const frame = useCurrentFrame();
	const content = scene.content as {
		objection?: string;
		response?: string;
		objection_label?: string;
		response_label?: string;
	};
	const objection = String(content.objection ?? '');
	const response = String(content.response ?? '');
	const objectionLabel = String(content.objection_label || 'OBJECTION');
	const responseLabel = String(content.response_label || 'RESPONSE');
	const accentHex = resolveColor(scene.accent_color, brand);

	const totalFrames = Math.max(1, scene.duration_seconds * fps);
	const midpoint = Math.floor(totalFrames * 0.48);

	const objOpacity = interpolate(frame, [midpoint - 10, midpoint], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const resOpacity = interpolate(frame, [midpoint, midpoint + 14], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const rate = 0.45;
	const typeCap = Math.min(objection.length, Math.floor(Math.min(frame, midpoint) * rate));

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				padding: '0 56px',
			}}
		>
			<div style={{ position: 'absolute', opacity: objOpacity, width: '100%', padding: '0 56px' }}>
				<div
					style={{
						fontSize: 20,
						letterSpacing: '3px',
						color: brand.colors.muted,
						fontFamily: brand.fonts.body,
						marginBottom: 16,
						textTransform: 'uppercase',
					}}
				>
					{objectionLabel}
				</div>
				<div
					style={{
						border: `2px solid ${brand.colors.muted}`,
						padding: '40px',
						fontFamily: brand.fonts.heading,
						fontSize: 44,
						color: brand.colors.primaryText,
						lineHeight: 1.35,
						fontStyle: 'italic',
					}}
				>
					{objection.slice(0, typeCap)}
				</div>
			</div>

			<div style={{ position: 'absolute', opacity: resOpacity, width: '100%', padding: '0 56px' }}>
				<div
					style={{
						fontSize: 20,
						letterSpacing: '3px',
						color: accentHex,
						fontFamily: brand.fonts.body,
						marginBottom: 16,
						textTransform: 'uppercase',
					}}
				>
					{responseLabel}
				</div>
				<div
					style={{
						border: `2px solid ${accentHex}`,
						backgroundColor: `${accentHex}14`,
						padding: '40px',
						fontFamily: brand.fonts.heading,
						fontSize: 44,
						color: brand.colors.primaryText,
						lineHeight: 1.35,
					}}
				>
					{response}
				</div>
			</div>
		</AbsoluteFill>
	);
};
