import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import type { BrandTheme } from '../types';
import { FilmGrain } from './FilmGrain';
import { Vignette } from './Vignette';

interface Props {
	brand: BrandTheme;
	children: React.ReactNode;
}

export const SceneWrapper: React.FC<Props> = ({ brand, children }) => {
	const noise = staticFile('textures/noise-dark.png');

	return (
		<AbsoluteFill>
			<AbsoluteFill style={{ backgroundColor: brand.colors.background }} />
			<AbsoluteFill
				style={{
					backgroundImage: `url(${noise})`,
					backgroundSize: '300px 300px',
					backgroundRepeat: 'repeat',
					opacity: 0.08,
					mixBlendMode: 'multiply',
				}}
			/>

			<AbsoluteFill>{children}</AbsoluteFill>

			<Vignette />
			<FilmGrain opacity={0.04} />
		</AbsoluteFill>
	);
};
