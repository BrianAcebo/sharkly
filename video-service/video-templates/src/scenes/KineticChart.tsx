import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { AccentBar } from '../components/AccentBar';
import { AnimatedText } from '../components/AnimatedText';
import { resolveColor, type AccentColor, type SceneProps } from '../types';

type ChartRow = {
	label: string;
	value: number;
	color?: AccentColor;
	animatedValue?: number;
};

export const KineticChart: React.FC<SceneProps> = ({ scene, brand }) => {
	const frame = useCurrentFrame();
	const content = scene.content as {
		heading?: string;
		chart_type?: string;
		data?: Array<{ label: string; value: number; color?: AccentColor }>;
		unit?: string;
		context?: string;
	};
	const heading = String(content.heading ?? '');
	const data = Array.isArray(content.data) ? content.data : [];
	const context = content.context ? String(content.context) : undefined;
	const accentHex = resolveColor(scene.accent_color, brand);

	const BAR_DELAY = 8;
	const BAR_DURATION = 20;
	const CHART_START = 20;

	const animatedData: ChartRow[] = data.map((item, i) => {
		const barStart = CHART_START + i * BAR_DELAY;
		const f = Math.max(0, frame - barStart);
		const progress = interpolate(f, [0, BAR_DURATION], [0, 1], {
			extrapolateRight: 'clamp',
			easing: Easing.out(Easing.back(1.2)),
		});
		return { ...item, animatedValue: item.value * progress };
	});

	return (
		<AbsoluteFill
			style={{
				flexDirection: 'column',
				padding: '80px 60px',
				justifyContent: 'center',
			}}
		>
			<AnimatedText
				animationStyle="fade_up"
				style={{
					fontFamily: brand.fonts.heading,
					fontSize: 48,
					fontWeight: 800,
					color: accentHex,
					marginBottom: 12,
				}}
			>
				{heading}
			</AnimatedText>
			<AccentBar color={accentHex} width={140} height={3} delay={12} style={{ marginBottom: 48 }} />

			<div style={{ width: '100%', height: 500 }}>
				{animatedData.length > 0 ? (
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={animatedData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
							<XAxis
								dataKey="label"
								tick={{ fill: brand.colors.muted, fontFamily: brand.fonts.body, fontSize: 22 }}
								axisLine={{ stroke: brand.colors.muted, strokeWidth: 1 }}
								tickLine={false}
							/>
							<YAxis hide />
							<Bar dataKey="animatedValue" radius={[6, 6, 0, 0]} maxBarSize={120}>
								{animatedData.map((entry, index) => (
									<Cell key={index} fill={resolveColor(entry.color ?? 'accent', brand)} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				) : null}
			</div>

			{context && (
				<AnimatedText
					animationStyle="fade_in"
					delay={CHART_START + data.length * BAR_DELAY + 10}
					style={{
						fontFamily: brand.fonts.body,
						fontSize: 26,
						color: brand.colors.muted,
						textAlign: 'center',
						marginTop: 24,
					}}
				>
					{context}
				</AnimatedText>
			)}
		</AbsoluteFill>
	);
};
