import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export interface AccentBarProps {
	color: string;
	delay?: number;
	width?: string | number;
	height?: number;
	style?: React.CSSProperties;
}

export const AccentBar: React.FC<AccentBarProps> = ({
	color,
	delay = 0,
	width = '100%',
	height = 3,
	style,
}) => {
	const frame = useCurrentFrame();
	const f = Math.max(0, frame - delay);
	const scaleX = interpolate(f, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

	return (
		<div
			style={{
				width,
				height,
				backgroundColor: color,
				transformOrigin: 'left center',
				transform: `scaleX(${scaleX})`,
				...style,
			}}
		/>
	);
};
