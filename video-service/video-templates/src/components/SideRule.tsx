import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export interface SideRuleProps {
	color: string;
	delay?: number;
	style?: React.CSSProperties;
}

export const SideRule: React.FC<SideRuleProps> = ({ color, delay = 0, style }) => {
	const frame = useCurrentFrame();
	const f = Math.max(0, frame - delay);
	const scaleY = interpolate(f, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

	return (
		<div
			style={{
				width: 3,
				backgroundColor: color,
				transformOrigin: 'top center',
				transform: `scaleY(${scaleY})`,
				...style,
			}}
		/>
	);
};
