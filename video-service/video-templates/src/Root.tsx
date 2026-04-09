import React from 'react';
import { Composition } from 'remotion';
import { VideoComposition } from './VideoComposition';
import { getTheme } from './themes';
import type { VideoProps } from './types';

const defaultProps: VideoProps = {
	fps: 30,
	brand: getTheme('sharkly'),
	scenes: [
		{
			scene_id: 'scene_01',
			type: 'cold_open',
			duration_seconds: 4,
			narration_segment: 'Preview narration',
			animation_style: 'stamp',
			transition_in: 'cut',
			accent_color: 'accent',
			content: {
				heading: 'HEADLINE',
				subheading: 'Subheading'
			}
		},
		{
			scene_id: 'scene_02',
			type: 'vox_documentary',
			duration_seconds: 5,
			narration_segment: 'Pull quote for the new scene type.',
			animation_style: 'fade_in',
			transition_in: 'fade',
			accent_color: 'accent',
			content: {
				quote: 'Organic motion and texture beat a flat slide deck every time.',
				attribution: 'Sharkly'
			}
		},
		{
			scene_id: 'scene_03',
			type: 'kinetic_chart',
			duration_seconds: 6,
			narration_segment: 'Chart narration.',
			animation_style: 'fade_up',
			transition_in: 'fade',
			accent_color: 'accent',
			content: {
				heading: 'Before vs after',
				chart_type: 'bar',
				data: [
					{ label: 'Before', value: 22, color: 'muted' as const },
					{ label: 'After', value: 78, color: 'accent' as const }
				],
				context: 'Illustrative sample data for Studio preview.'
			}
		}
	]
};

export const Root: React.FC = () => {
	return (
		<>
			<Composition
				id="VideoComposition"
				component={VideoComposition}
				durationInFrames={120}
				fps={30}
				width={1080}
				height={1920}
				defaultProps={defaultProps}
				calculateMetadata={({ props }) => {
					const list = props.scenes ?? [];
					const totalSeconds = list.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);
					const seconds = totalSeconds > 0 ? totalSeconds : 1;
					const fps = props.fps ?? 30;
					return { durationInFrames: Math.max(1, Math.round(seconds * fps)) };
				}}
			/>
		</>
	);
};
