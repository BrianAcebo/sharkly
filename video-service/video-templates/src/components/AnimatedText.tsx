import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';

export interface AnimatedTextProps {
	children: React.ReactNode;
	style?: React.CSSProperties;
	animationStyle?: string;
	/** Frames to wait before starting */
	delay?: number;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
	children,
	style,
	animationStyle = 'fade_up',
	delay = 0,
}) => {
	const frame = useCurrentFrame();
	const f = Math.max(0, frame - delay);

	let opacity = 1;
	let translateY = 0;
	let translateX = 0;

	if (animationStyle === 'fade_up') {
		opacity = interpolate(f, [0, 20], [0, 1], {
			extrapolateRight: 'clamp',
			easing: Easing.out(Easing.ease),
		});
		translateY = interpolate(f, [0, 20], [30, 0], {
			extrapolateRight: 'clamp',
			easing: Easing.out(Easing.ease),
		});
	} else if (animationStyle === 'fade_in') {
		opacity = interpolate(f, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
	} else if (animationStyle === 'slide_in') {
		opacity = interpolate(f, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
		translateX = interpolate(f, [0, 20], [40, 0], {
			extrapolateRight: 'clamp',
			easing: Easing.out(Easing.back(1.2)),
		});
	} else if (animationStyle === 'slide_up') {
		opacity = interpolate(f, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
		translateY = interpolate(f, [0, 20], [50, 0], {
			extrapolateRight: 'clamp',
			easing: Easing.out(Easing.back(1.5)),
		});
	} else {
		opacity = interpolate(f, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
	}

	return (
		<div
			style={{
				opacity,
				transform: `translateY(${translateY}px) translateX(${translateX}px)`,
				...style,
			}}
		>
			{children}
		</div>
	);
};
