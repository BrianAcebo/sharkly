import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { resolveColor, type AccentColor, type SceneProps } from '../types';

const NODE_DELAY = 22;
const ARROW_FRAMES = 14;

export const MechanismDiagram: React.FC<SceneProps> = ({ scene, brand }) => {
	const frame = useCurrentFrame();
	const content = scene.content as {
		nodes?: Array<{ label: string; color: AccentColor }>;
		direction?: 'horizontal' | 'vertical';
	};
	const nodes = content.nodes ?? [];
	const direction = content.direction ?? 'horizontal';

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				padding: '48px 40px',
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: direction === 'vertical' ? 'column' : 'row',
					alignItems: 'center',
					gap: direction === 'vertical' ? 20 : 12,
					justifyContent: 'center',
				}}
			>
				{nodes.map((node, i) => {
					const nodeDelay = i * NODE_DELAY;
					const nf = Math.max(0, frame - nodeDelay);
					const nodeOpacity = interpolate(nf, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
					const nodeScale = interpolate(nf, [0, 14], [0.92, 1], { extrapolateRight: 'clamp' });
					const fill = resolveColor(node.color, brand);

					const arrow =
						i > 0 ? (
							<ArrowSegment
								key={`arr-${i}`}
								frame={frame}
								delay={(i - 1) * NODE_DELAY + 14}
								vertical={direction === 'vertical'}
								color={brand.colors.muted}
							/>
						) : null;

					const box = (
						<div
							key={`node-${i}`}
							style={{
								minWidth: 160,
								maxWidth: 280,
								padding: '18px 22px',
								borderRadius: 12,
								border: `2px solid ${fill}`,
								backgroundColor: `${fill}22`,
								fontFamily: brand.fonts.body,
								fontSize: 26,
								fontWeight: 600,
								color: brand.colors.primaryText,
								textAlign: 'center',
								opacity: nodeOpacity,
								transform: `scale(${nodeScale})`,
							}}
						>
							{node.label}
						</div>
					);

					return (
						<React.Fragment key={node.label + String(i)}>
							{arrow}
							{box}
						</React.Fragment>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};

function ArrowSegment({
	frame,
	delay,
	vertical,
	color,
}: {
	frame: number;
	delay: number;
	vertical: boolean;
	color: string;
}) {
	const f = Math.max(0, frame - delay);
	const t = interpolate(f, [0, ARROW_FRAMES], [0, 1], { extrapolateRight: 'clamp' });
	if (vertical) {
		return (
			<div
				style={{
					width: 4,
					height: 32,
					background: `linear-gradient(to bottom, ${color}, ${color})`,
					transformOrigin: 'top center',
					transform: `scaleY(${t})`,
					borderRadius: 2,
				}}
			/>
		);
	}
	return (
		<div style={{ display: 'flex', alignItems: 'center', height: 4 }}>
			<div
				style={{
					width: 48,
					height: 4,
					backgroundColor: color,
					transformOrigin: 'left center',
					transform: `scaleX(${t})`,
					borderRadius: 2,
				}}
			/>
			<div style={{ fontSize: 20, color, marginLeft: -4 }}>→</div>
		</div>
	);
}
