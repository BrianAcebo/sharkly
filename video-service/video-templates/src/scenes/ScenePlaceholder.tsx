import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AccentBar, AnimatedText } from '../components';
import { resolveColor, type BrandTheme, type Scene } from '../types';

/**
 * Temporary per-scene body until real scene components land (Stage 5).
 * Exercises Stage 4 primitives; does not replace full-frame background — `SceneWrapper` owns the base.
 */
export const ScenePlaceholder: React.FC<{ scene: Scene; brand: BrandTheme }> = ({ scene, brand }) => {
	const accent = resolveColor(scene.accent_color, brand);
	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				flexDirection: 'column',
				fontFamily: 'system-ui, sans-serif',
			}}
		>
			<AnimatedText
				animationStyle="fade_up"
				style={{
					color: brand.colors.primaryText,
					fontSize: 32,
					fontWeight: 700,
					textAlign: 'center',
					padding: '0 40px',
				}}
			>
				{scene.scene_id}
			</AnimatedText>
			<AccentBar color={accent} width={200} height={5} delay={14} style={{ marginTop: 22 }} />
			<AnimatedText
				animationStyle="fade_in"
				delay={22}
				style={{
					color: brand.colors.muted,
					fontSize: 22,
					marginTop: 18,
					textAlign: 'center',
				}}
			>
				{scene.type}
			</AnimatedText>
		</AbsoluteFill>
	);
};
