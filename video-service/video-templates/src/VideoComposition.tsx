import React from 'react';
import { AbsoluteFill, Series } from 'remotion';
import { SceneWrapper } from './global/SceneWrapper';
import { BulletPoints } from './scenes/BulletPoints';
import { Checklist } from './scenes/Checklist';
import { ClosingCard } from './scenes/ClosingCard';
import { ColdOpen } from './scenes/ColdOpen';
import { ComparisonTable } from './scenes/ComparisonTable';
import { EvidenceStack } from './scenes/EvidenceStack';
import { KineticChart } from './scenes/KineticChart';
import { MechanismDiagram } from './scenes/MechanismDiagram';
import { MythVsReality } from './scenes/MythVsReality';
import { ObjectionRebuttal } from './scenes/ObjectionRebuttal';
import { QuoteCard } from './scenes/QuoteCard';
import { ScenePlaceholder } from './scenes/ScenePlaceholder';
import { ScriptureQuote } from './scenes/ScriptureQuote';
import { SectionHeader } from './scenes/SectionHeader';
import { StatCallout } from './scenes/StatCallout';
import { TextReveal } from './scenes/TextReveal';
import { TitleCard } from './scenes/TitleCard';
import { VoxDocumentary } from './scenes/VoxDocumentary';
import type { SceneProps, VideoProps } from './types';

const SCENE_MAP: Record<string, React.FC<SceneProps>> = {
	cold_open: ColdOpen,
	title_card: TitleCard,
	section_header: SectionHeader,
	bullet_points: BulletPoints,
	stat_callout: StatCallout,
	text_reveal: TextReveal,
	quote_card: QuoteCard,
	comparison_table: ComparisonTable,
	closing_card: ClosingCard,
	myth_vs_reality: MythVsReality,
	checklist: Checklist,
	mechanism_diagram: MechanismDiagram,
	scripture_quote: ScriptureQuote,
	evidence_stack: EvidenceStack,
	objection_rebuttal: ObjectionRebuttal,
	vox_documentary: VoxDocumentary,
	kinetic_chart: KineticChart,
};

export const VideoComposition: React.FC<VideoProps> = ({ scenes, brand, fps }) => {
	return (
		<AbsoluteFill>
			<Series>
				{scenes.map((scene) => {
					const Cmp = SCENE_MAP[scene.type];
					const durationInFrames = Math.max(1, Math.round(scene.duration_seconds * fps));
					return (
						<Series.Sequence key={scene.scene_id} durationInFrames={durationInFrames}>
							<SceneWrapper brand={brand}>
								{Cmp ? (
									<Cmp scene={scene} brand={brand} fps={fps} />
								) : (
									<ScenePlaceholder scene={scene} brand={brand} />
								)}
							</SceneWrapper>
						</Series.Sequence>
					);
				})}
			</Series>
		</AbsoluteFill>
	);
};
