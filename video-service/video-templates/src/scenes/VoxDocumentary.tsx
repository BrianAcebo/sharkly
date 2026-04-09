import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { NoiseBackground } from '../components/NoiseBackground';
import { VoxHighlighter } from '../components/VoxHighlighter';
import type { SceneProps } from '../types';

export const VoxDocumentary: React.FC<SceneProps> = ({ scene, brand }) => {
	const frame = useCurrentFrame();
	const content = scene.content as {
		quote?: string;
		attribution?: string;
		highlight_words?: string[];
	};
	const quote = String(content.quote ?? '');
	const attribution = content.attribution ? String(content.attribution) : undefined;

	const cardY = interpolate(frame, [0, 22], [80, 0], {
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.back(1.3)),
	});
	const cardOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });

	const jitterX = Math.sin(frame * 0.3) * 1.5;
	const jitterRotate = Math.sin(frame * 0.2) * 0.4;

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				padding: '0 60px',
			}}
		>
			<div
				style={{
					opacity: cardOpacity,
					transform: `translateY(${cardY}px) translateX(${jitterX}px) rotate(${jitterRotate}deg)`,
					backgroundColor: '#f4f1eb',
					padding: '52px 56px',
					width: '100%',
					position: 'relative',
					boxShadow: '4px 6px 24px rgba(0,0,0,0.35)',
				}}
			>
				<NoiseBackground
					baseColor="transparent"
					textureOpacity={0.12}
					textureFile="textures/noise-light.png"
					style={{ position: 'absolute', inset: 0, borderRadius: 2 }}
				/>

				<div
					style={{
						height: 2,
						backgroundColor: '#1a1a1a',
						marginBottom: 28,
						width: '100%',
						position: 'relative',
					}}
				/>

				<div
					style={{
						position: 'relative',
						fontFamily: brand.fonts.heading,
						fontSize: 44,
						color: '#1a1a1a',
						lineHeight: 1.4,
						marginBottom: 32,
					}}
				>
					{quote}
					<VoxHighlighter color="#FFD700" delay={28} width="100%" />
				</div>

				{attribution && (
					<div
						style={{
							position: 'relative',
							fontFamily: brand.fonts.body,
							fontSize: 22,
							color: '#555',
							borderTop: '1px solid #ccc',
							paddingTop: 16,
						}}
					>
						— {attribution}
					</div>
				)}
			</div>
		</AbsoluteFill>
	);
};
