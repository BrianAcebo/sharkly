import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';

export interface HighlightRectProps {
	color: string;
	opacity?: number;
	delay?: number;
	animationStyle?: 'slide_in' | 'stamp' | 'fade_in';
	style?: React.CSSProperties;
	children?: React.ReactNode;
}

export const HighlightRect: React.FC<HighlightRectProps> = ({
	color,
	opacity = 0.15,
	delay = 0,
	animationStyle = 'fade_in',
	style,
	children,
}) => {
	const frame = useCurrentFrame();
	const f = Math.max(0, frame - delay);

	let rectOpacity = opacity;
	let scale = 1;
	let translateX = 0;

	if (animationStyle === 'stamp') {
		scale = interpolate(f, [0, 8], [1.08, 1], {
			extrapolateRight: 'clamp',
			easing: Easing.out(Easing.back(2)),
		});
		rectOpacity = interpolate(f, [0, 6], [0, opacity], { extrapolateRight: 'clamp' });
	} else if (animationStyle === 'slide_in') {
		translateX = interpolate(f, [0, 20], [-60, 0], {
			extrapolateRight: 'clamp',
			easing: Easing.out(Easing.ease),
		});
		rectOpacity = interpolate(f, [0, 10], [0, opacity], { extrapolateRight: 'clamp' });
	} else {
		rectOpacity = interpolate(f, [0, 15], [0, opacity], { extrapolateRight: 'clamp' });
	}

	return (
		<div
			style={{
				backgroundColor: color,
				opacity: rectOpacity,
				transform: `scale(${scale}) translateX(${translateX}px)`,
				position: 'relative',
				...style,
			}}
		>
			{children}
		</div>
	);
};
