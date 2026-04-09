import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AnimatedText } from '../components/AnimatedText';
import { SideRule } from '../components/SideRule';
import { resolveColor, type SceneProps } from '../types';

export const TextReveal: React.FC<SceneProps> = ({ scene, brand }) => {
	const content = scene.content as { body?: string };
	const body = String(content.body ?? '');
	const accentHex = resolveColor(scene.accent_color, brand);
	const fontSize = Math.max(28, Math.min(40, 48 - Math.floor(body.length / 100)));

	return (
		<AbsoluteFill
			style={{
				flexDirection: 'row',
				padding: '80px 72px',
				justifyContent: 'center',
				alignItems: 'center',
				gap: 36,
			}}
		>
			<SideRule color={accentHex} style={{ height: Math.min(720, body.length * 2 + 200) }} />
			<AnimatedText
				animationStyle="fade_in"
				delay={16}
				style={{
					fontFamily: brand.fonts.body,
					fontSize,
					color: brand.colors.primaryText,
					lineHeight: 1.45,
					flex: 1,
				}}
			>
				{body}
			</AnimatedText>
		</AbsoluteFill>
	);
};
