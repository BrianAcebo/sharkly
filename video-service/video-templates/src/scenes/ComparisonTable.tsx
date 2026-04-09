import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { resolveColor, type SceneProps } from '../types';

const NEGATIVE = '#c0392b';
const ROW_STAGGER = 8;

export const ComparisonTable: React.FC<SceneProps> = ({ scene, brand }) => {
	const frame = useCurrentFrame();
	const content = scene.content as {
		left_header?: string;
		right_header?: string;
		rows?: Array<{ left: string; right: string }>;
	};
	const leftHeader = String(content.left_header ?? '');
	const rightHeader = String(content.right_header ?? '');
	const rows = Array.isArray(content.rows) ? content.rows : [];
	const accentHex = resolveColor(scene.accent_color, brand);

	return (
		<AbsoluteFill
			style={{
				padding: '64px 48px',
				justifyContent: 'center',
			}}
		>
			<div
				style={{
					borderRadius: 8,
					overflow: 'hidden',
					border: `1px solid ${brand.colors.muted}`,
				}}
			>
				<div style={{ display: 'flex', flexDirection: 'row' }}>
					<div
						style={{
							flex: 1,
							backgroundColor: NEGATIVE,
							color: '#fff',
							fontFamily: brand.fonts.body,
							fontSize: 22,
							fontWeight: 700,
							padding: '16px 20px',
						}}
					>
						{leftHeader}
					</div>
					<div
						style={{
							flex: 1,
							backgroundColor: accentHex,
							color: '#fff',
							fontFamily: brand.fonts.body,
							fontSize: 22,
							fontWeight: 700,
							padding: '16px 20px',
						}}
					>
						{rightHeader}
					</div>
				</div>
				{rows.map((row, i) => {
					const delay = 20 + i * ROW_STAGGER;
					const f = Math.max(0, frame - delay);
					const opacity = interpolate(f, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
					return (
						<div
							key={i}
							style={{
								display: 'flex',
								flexDirection: 'row',
								borderTop: `1px solid ${brand.colors.muted}`,
								opacity,
							}}
						>
							<div
								style={{
									flex: 1,
									padding: '14px 20px',
									fontFamily: brand.fonts.body,
									fontSize: 24,
									color: brand.colors.primaryText,
									backgroundColor: 'rgba(255,255,255,0.03)',
								}}
							>
								{row.left}
							</div>
							<div
								style={{
									flex: 1,
									padding: '14px 20px',
									fontFamily: brand.fonts.body,
									fontSize: 24,
									color: brand.colors.primaryText,
								}}
							>
								{row.right}
							</div>
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
