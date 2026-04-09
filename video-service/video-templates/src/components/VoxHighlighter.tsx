import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export interface VoxHighlighterProps {
	color?: string;
	delay?: number;
	width?: string | number;
	thickness?: number;
}

export const VoxHighlighter: React.FC<VoxHighlighterProps> = ({
	color = '#FFD700',
	delay = 0,
	width = '100%',
	thickness = 18,
}) => {
	const frame = useCurrentFrame();
	const f = Math.max(0, frame - delay);
	const progress = interpolate(f, [0, 25], [0, 1], { extrapolateRight: 'clamp' });

	const path =
		'M 4,10 C 20,8 40,12 80,10 C 120,8 160,12 200,10 C 240,8 280,12 320,10 C 360,8 400,12 440,10 C 480,8 520,12 560,10';
	const pathLength = 560;

	return (
		<div
			style={{
				position: 'absolute',
				bottom: -6,
				left: 0,
				width,
				height: thickness + 10,
				pointerEvents: 'none',
				opacity: 0.55,
			}}
		>
			<svg
				viewBox={`0 0 ${pathLength} 24`}
				preserveAspectRatio="none"
				style={{ width: '100%', height: '100%' }}
			>
				<path
					d={path}
					stroke={color}
					strokeWidth={thickness + 4}
					strokeLinecap="round"
					fill="none"
					strokeDasharray={pathLength}
					strokeDashoffset={pathLength * (1 - progress * 0.15)}
					opacity={0.3}
				/>
				<path
					d={path}
					stroke={color}
					strokeWidth={thickness}
					strokeLinecap="round"
					fill="none"
					strokeDasharray={pathLength}
					strokeDashoffset={pathLength * (1 - progress)}
				/>
			</svg>
		</div>
	);
};
