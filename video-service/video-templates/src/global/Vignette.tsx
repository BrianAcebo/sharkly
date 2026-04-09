import React from 'react';
import { AbsoluteFill } from 'remotion';

export const Vignette: React.FC = () => (
	<AbsoluteFill style={{ pointerEvents: 'none', zIndex: 99 }}>
		<div
			style={{
				position: 'absolute',
				inset: 0,
				background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)',
			}}
		/>
	</AbsoluteFill>
);
