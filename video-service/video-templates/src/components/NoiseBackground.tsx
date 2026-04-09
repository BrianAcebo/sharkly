import React from 'react';
import { staticFile } from 'remotion';

export interface NoiseBackgroundProps {
	baseColor: string;
	textureOpacity?: number;
	/** `noise-dark.png` or `noise-light.png` under `public/textures/` */
	textureFile?: string;
	style?: React.CSSProperties;
}

export const NoiseBackground: React.FC<NoiseBackgroundProps> = ({
	baseColor,
	textureOpacity = 0.12,
	textureFile = 'textures/noise-dark.png',
	style,
}) => {
	const src = staticFile(textureFile);

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				backgroundColor: baseColor,
				...style,
			}}
		>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					backgroundImage: `url(${src})`,
					backgroundSize: '250px 250px',
					opacity: textureOpacity,
					mixBlendMode: 'multiply',
				}}
			/>
		</div>
	);
};
