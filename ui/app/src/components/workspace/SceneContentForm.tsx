/**
 * Human-friendly slide content fields (no raw JSON).
 * Maps to VideoScene.content — shape must match Remotion scenes + Claude schema.
 */
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import TextArea from '../form/input/TextArea';
import { Input } from '../ui/input';
import { Plus, Trash2 } from 'lucide-react';
import type { VideoScene } from '../../types/videoScript';
import { isRecord } from '../../types/videoScript';

function txt(v: unknown): string {
	return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function strArr(v: unknown): string[] {
	if (!Array.isArray(v)) return [];
	return v.map((x) => (typeof x === 'string' ? x : String(x)));
}

type Props = {
	scene: VideoScene;
	onChange: (content: VideoScene['content']) => void;
};

export function SceneContentForm({ scene, onChange }: Props) {
	const c = scene.content;
	const t = scene.type;

	const field = (label: string, key: string, multiline = false, placeholder?: string) => {
		const val = txt(c[key]);
		const commit = (s: string) => onChange({ ...c, [key]: s });
		return (
			<div className="grid gap-1.5">
				<Label className="text-foreground">{label}</Label>
				{multiline ? (
					<TextArea
						value={val}
						onChange={(e) => commit(e.target.value)}
						rows={4}
						className="text-sm"
						placeholder={placeholder}
					/>
				) : (
					<Input value={val} onChange={(e) => commit(e.target.value)} placeholder={placeholder} />
				)}
			</div>
		);
	};

	if (t === 'cold_open' || t === 'title_card') {
		return (
			<div className="grid gap-3">
				{field('Main headline', 'heading', false, 'Large text on screen')}
				{field('Subheading (optional)', 'subheading', false, 'Supporting line')}
			</div>
		);
	}

	if (t === 'section_header') {
		return (
			<div className="grid gap-3">
				{field('Section title', 'heading')}
				{field('Label (optional)', 'label', false, 'e.g. Part 2')}
			</div>
		);
	}

	if (t === 'bullet_points') {
		const bullets = strArr(c.bullets);
		const lines = bullets.join('\n');
		return (
			<div className="grid gap-3">
				{field('Slide heading', 'heading')}
				<div className="grid gap-1.5">
					<Label>Bullet points (one per line)</Label>
					<TextArea
						value={lines}
						onChange={(e) =>
							onChange({
								...c,
								bullets: e.target.value
									.split('\n')
									.map((s) => s.trim())
									.filter(Boolean)
							})
						}
						rows={6}
						className="text-sm"
						placeholder={'Point one\nPoint two'}
					/>
				</div>
				<p className="text-muted-foreground text-[11px]">
					Emphasize specific bullets using “Emphasis indices” in the scene settings (0 = first line).
				</p>
			</div>
		);
	}

	if (t === 'stat_callout') {
		return (
			<div className="grid gap-3">
				{field('Label (small caps)', 'label', false, 'e.g. MANUSCRIPT COUNT')}
				{field('Big number or stat', 'stat', false, '5,800')}
				{field('Context line', 'context', true)}
			</div>
		);
	}

	if (t === 'text_reveal') {
		return <div className="grid gap-3">{field('Paragraph', 'body', true)}</div>;
	}

	if (t === 'quote_card') {
		return (
			<div className="grid gap-3">
				{field('Quote', 'quote', true)}
				{field('Attribution (optional)', 'attribution', false, '— Author')}
			</div>
		);
	}

	if (t === 'comparison_table') {
		const rowsRaw = c.rows;
		const rows: Array<{ left: string; right: string }> = Array.isArray(rowsRaw)
			? rowsRaw.map((r) =>
					isRecord(r)
						? { left: txt(r.left), right: txt(r.right) }
						: { left: '', right: '' }
				)
			: [];
		const setRow = (i: number, side: 'left' | 'right', v: string) => {
			const next = [...rows];
			if (!next[i]) next[i] = { left: '', right: '' };
			next[i] = { ...next[i], [side]: v };
			onChange({ ...c, rows: next });
		};
		const addRow = () => onChange({ ...c, rows: [...rows, { left: '', right: '' }] });
		const removeRow = (i: number) => onChange({ ...c, rows: rows.filter((_, j) => j !== i) });
		return (
			<div className="grid gap-3">
				{field('Left column header', 'left_header', false, 'Old way')}
				{field('Right column header', 'right_header', false, 'Better way')}
				<div className="space-y-2">
					<Label>Rows</Label>
					{rows.map((row, i) => (
						<div key={i} className="flex flex-wrap items-end gap-2">
							<Input
								className="min-w-[120px] flex-1"
								placeholder="Left cell"
								value={row.left}
								onChange={(e) => setRow(i, 'left', e.target.value)}
							/>
							<Input
								className="min-w-[120px] flex-1"
								placeholder="Right cell"
								value={row.right}
								onChange={(e) => setRow(i, 'right', e.target.value)}
							/>
							<Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)}>
								<Trash2 className="size-4" />
							</Button>
						</div>
					))}
					<Button type="button" variant="outline" size="sm" onClick={addRow}>
						<Plus className="mr-1 size-3.5" /> Add row
					</Button>
				</div>
			</div>
		);
	}

	if (t === 'closing_card') {
		return (
			<div className="grid gap-3">
				{field('Closing headline', 'heading')}
				{field('Call to action (optional)', 'cta', false, 'Try Sharkly')}
				{field('URL (optional)', 'url', false, 'https://…')}
			</div>
		);
	}

	if (t === 'vox_documentary') {
		const hw = strArr(c.highlight_words);
		const hwLines = hw.join('\n');
		return (
			<div className="grid gap-3">
				{field('Pull quote', 'quote', true)}
				{field('Attribution (optional)', 'attribution', false)}
				<div className="grid gap-1.5">
					<Label>Words to highlight (optional, one per line)</Label>
					<TextArea
						value={hwLines}
						onChange={(e) =>
							onChange({
								...c,
								highlight_words: e.target.value
									.split('\n')
									.map((s) => s.trim())
									.filter(Boolean)
							})
						}
						rows={3}
						className="text-sm"
						placeholder={'keyword one\nkeyword two'}
					/>
				</div>
			</div>
		);
	}

	if (t === 'kinetic_chart') {
		const dataRaw = c.data;
		const rows: Array<{ label: string; value: string; color: string }> = Array.isArray(dataRaw)
			? dataRaw.map((r) =>
					isRecord(r)
						? {
								label: txt(r.label),
								value: txt(r.value),
								color: txt(r.color) || 'accent'
							}
						: { label: '', value: '', color: 'accent' }
				)
			: [];
		const toDataPayload = (list: typeof rows) =>
			list.map((r) => ({
				label: r.label,
				value: Number(r.value) || 0,
				color: (r.color || 'accent') as string
			}));
		const setRow = (i: number, patch: Partial<{ label: string; value: string; color: string }>) => {
			const next = [...rows];
			next[i] = { ...next[i], ...patch };
			onChange({ ...c, data: toDataPayload(next) });
		};
		const addRow = () =>
			onChange({
				...c,
				data: [...toDataPayload(rows), { label: '', value: 0, color: 'accent' }]
			});
		const removeRow = (i: number) =>
			onChange({ ...c, data: toDataPayload(rows.filter((_, j) => j !== i)) });
		return (
			<div className="grid gap-3">
				{field('Chart title', 'heading')}
				<div className="grid gap-1.5">
					<Label>Chart type</Label>
					<select
						className="border-input bg-background h-9 rounded-md border px-2 text-sm"
						value={txt(c.chart_type) || 'bar'}
						onChange={(e) => onChange({ ...c, chart_type: e.target.value })}
					>
						<option value="bar">bar</option>
						<option value="comparison_bar">comparison_bar</option>
					</select>
				</div>
				<div className="space-y-2">
					<Label>Data rows</Label>
					{rows.map((row, i) => (
						<div key={i} className="flex flex-wrap items-end gap-2">
							<Input
								className="min-w-[100px] flex-1"
								placeholder="Label"
								value={row.label}
								onChange={(e) => setRow(i, { label: e.target.value })}
							/>
							<Input
								className="w-24"
								type="number"
								placeholder="Value"
								value={row.value}
								onChange={(e) => setRow(i, { value: e.target.value })}
							/>
							<select
								className="border-input bg-background h-9 rounded-md border px-2 text-sm"
								value={row.color || 'accent'}
								onChange={(e) => setRow(i, { color: e.target.value })}
							>
								<option value="accent">accent</option>
								<option value="primary_text">primary_text</option>
								<option value="gold">gold</option>
								<option value="muted">muted</option>
							</select>
							<Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)}>
								<Trash2 className="size-4" />
							</Button>
						</div>
					))}
					<Button type="button" variant="outline" size="sm" onClick={addRow}>
						<Plus className="mr-1 size-3.5" /> Add bar
					</Button>
				</div>
				{field('Unit suffix (optional)', 'unit', false, '%')}
				{field('Caption below chart (optional)', 'context', true)}
			</div>
		);
	}

	if (t === 'myth_vs_reality') {
		return (
			<div className="grid gap-3">
				{field('Myth / misconception', 'myth', true)}
				{field('Reality / truth', 'reality', true)}
			</div>
		);
	}

	if (t === 'checklist') {
		const items = strArr(c.items);
		const lines = items.join('\n');
		return (
			<div className="grid gap-3">
				{field('Checklist title', 'heading')}
				<div className="grid gap-1.5">
					<Label>Steps (one per line)</Label>
					<TextArea
						value={lines}
						onChange={(e) =>
							onChange({
								...c,
								items: e.target.value
									.split('\n')
									.map((s) => s.trim())
									.filter(Boolean)
							})
						}
						rows={6}
					/>
				</div>
			</div>
		);
	}

	if (t === 'mechanism_diagram') {
		const nodesRaw = c.nodes;
		const nodes: Array<{ label: string; color: string }> = Array.isArray(nodesRaw)
			? nodesRaw.map((n) =>
					isRecord(n)
						? { label: txt(n.label), color: txt(n.color) || 'primary_text' }
						: { label: '', color: 'primary_text' }
				)
			: [];
		const setNode = (i: number, patch: Partial<{ label: string; color: string }>) => {
			const next = [...nodes];
			next[i] = { ...next[i], ...patch };
			onChange({ ...c, nodes: next });
		};
		const add = () => onChange({ ...c, nodes: [...nodes, { label: '', color: 'primary_text' }] });
		const remove = (i: number) => onChange({ ...c, nodes: nodes.filter((_, j) => j !== i) });
		return (
			<div className="grid gap-3">
				<p className="text-muted-foreground text-xs">2–4 nodes in a simple flow.</p>
				{nodes.map((n, i) => (
					<div key={i} className="flex flex-wrap gap-2">
						<Input
							className="min-w-[160px] flex-1"
							placeholder="Label"
							value={n.label}
							onChange={(e) => setNode(i, { label: e.target.value })}
						/>
						<Input
							className="w-36"
							placeholder="Color key"
							value={n.color}
							onChange={(e) => setNode(i, { color: e.target.value })}
						/>
						<Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
							<Trash2 className="size-4" />
						</Button>
					</div>
				))}
				<Button type="button" variant="outline" size="sm" onClick={add}>
					<Plus className="mr-1 size-3.5" /> Add node
				</Button>
				<div className="grid gap-1.5">
					<Label>Direction</Label>
					<select
						className="border-input bg-background h-9 rounded-md border px-2 text-sm"
						value={txt(c.direction) || 'horizontal'}
						onChange={(e) => onChange({ ...c, direction: e.target.value })}
					>
						<option value="horizontal">Horizontal</option>
						<option value="vertical">Vertical</option>
					</select>
				</div>
			</div>
		);
	}

	if (t === 'scripture_quote') {
		return (
			<div className="grid gap-3">
				{field('Verse text', 'verse', true)}
				{field('Reference', 'reference', false, 'John 3:16')}
			</div>
		);
	}

	if (t === 'evidence_stack') {
		const pointsRaw = c.points;
		const points: Array<{ number?: string; title?: string; detail?: string }> = Array.isArray(
			pointsRaw
		)
			? pointsRaw.map((p) =>
					isRecord(p)
						? {
								number: txt(p.number),
								title: txt(p.title),
								detail: txt(p.detail)
							}
						: {}
				)
			: [];
		const setPt = (i: number, patch: Record<string, string>) => {
			const next = [...points];
			next[i] = { ...next[i], ...patch };
			onChange({ ...c, points: next });
		};
		const addPt = () =>
			onChange({
				...c,
				points: [...points, { number: String(points.length + 1), title: '', detail: '' }]
			});
		const removePt = (i: number) => onChange({ ...c, points: points.filter((_, j) => j !== i) });
		return (
			<div className="grid gap-3">
				{field('Section heading', 'heading')}
				{points.map((p, i) => (
					<div key={i} className="space-y-2 rounded-md border border-gray-100 p-3 dark:border-gray-800">
						<div className="flex justify-end">
							<Button type="button" variant="ghost" size="sm" onClick={() => removePt(i)}>
								Remove
							</Button>
						</div>
						<Input
							placeholder="① Number / badge"
							value={txt(p.number)}
							onChange={(e) => setPt(i, { number: e.target.value })}
						/>
						<Input
							placeholder="Title"
							value={txt(p.title)}
							onChange={(e) => setPt(i, { title: e.target.value })}
						/>
						<TextArea
							placeholder="Detail"
							rows={2}
							value={txt(p.detail)}
							onChange={(e) => setPt(i, { detail: e.target.value })}
						/>
					</div>
				))}
				<Button type="button" variant="outline" size="sm" onClick={addPt}>
					<Plus className="mr-1 size-3.5" /> Add evidence card
				</Button>
			</div>
		);
	}

	if (t === 'objection_rebuttal') {
		return (
			<div className="grid gap-3">
				{field('Objection label', 'objection_label', false, 'SKEPTIC SAYS')}
				{field('Response label', 'response_label', false, 'THE EVIDENCE')}
				{field('Objection', 'objection', true)}
				{field('Response', 'response', true)}
			</div>
		);
	}

	return (
		<div className="grid gap-2">
			<p className="text-muted-foreground text-xs">
				Content fields for “{t.replace(/_/g, ' ')}” — use the JSON tab if you need advanced edits.
			</p>
			<TextArea
				className="font-mono text-xs"
				rows={6}
				value={JSON.stringify(c, null, 2)}
				onChange={(e) => {
					try {
						const p = JSON.parse(e.target.value) as unknown;
						if (p && typeof p === 'object' && !Array.isArray(p)) {
							onChange(p as VideoScene['content']);
						}
					} catch {
						/* ignore */
					}
				}}
			/>
		</div>
	);
}
