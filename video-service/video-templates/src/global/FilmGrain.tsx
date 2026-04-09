import React from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame } from 'remotion';

interface Props {
	opacity?: number;
	/** Defaults to dark tile; use `noise-light.png` on light bases if needed */
	textureFile?: string;
}

export const FilmGrain: React.FC<Props> = ({ opacity = 0.04, textureFile = 'textures/noise-dark.png' }) => {
	const frame = useCurrentFrame();
	const offsetX = (frame * 97) % 200;
	const offsetY = (frame * 53) % 200;
	const src = staticFile(textureFile);

	return (
		<AbsoluteFill style={{ pointerEvents: 'none', zIndex: 100 }}>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					opacity,
					backgroundImage: `url(${src})`,
					backgroundSize: '200px 200px',
					backgroundPosition: `${offsetX}px ${offsetY}px`,
					mixBlendMode: 'screen',
				}}
			/>
		</AbsoluteFill>
	);
};
