/**
 * Customer Journey Map — SVG diagram (funnel-visualizer.md spec)
 * Three-stage layout: Awareness | Consideration → Destination at bottom
 * Visual flow with page nodes, arrow from anchor to destination.
 */
import React from 'react';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import type { PageData } from '../../hooks/useClusterPages';

type SpecStage = 'awareness' | 'consideration';

function getFunnelColumn(page: PageData): SpecStage {
	if (page.type === 'focus_page') return 'consideration';
	if (page.funnel === 'tofu') return 'awareness';
	return 'consideration';
}

const STAGE_COLORS = {
	awareness: { bg: '#dbeafe', stroke: '#3b82f6', text: '#1d4ed8' },
	consideration: { bg: '#fef3c7', stroke: '#f59e0b', text: '#b45309' },
	destination: { bg: '#e0e7ff', stroke: '#6366f1', text: '#4f46e5' }
};

export function CustomerJourneyMap({
	pages,
	destinationUrl,
	destinationLabel,
	onAddDestination,
	onAddArticle
}: {
	pages: PageData[];
	destinationUrl?: string | null;
	destinationLabel?: string | null;
	onAddDestination?: () => void;
	onAddArticle?: () => void;
}) {
	const navigate = useNavigate();
	const awareness = pages.filter((p) => getFunnelColumn(p) === 'awareness');
	const consideration = pages.filter((p) => getFunnelColumn(p) === 'consideration');

	const hasDestination = !!destinationUrl;

	const W = 900;
	const H = 440;
	const colW = W / 3;
	const aCx = colW * 0.5;
	const cCx = colW * 1.5;
	const destCx = colW * 2.5;

	const flowY = 60;
	const boxTop = 85;
	const boxH = 140;
	const destTop = 280;
	const destH = 70;

	const nodeR = 18;

	const placeNodes = (list: PageData[], colX: number) => {
		const n = list.length;
		const step = Math.min(40, (boxH - 28) / Math.max(1, n));
		const startY = boxTop + 20;
		return list.map((p, i) => ({
			page: p,
			x: colX,
			y: startY + i * step
		}));
	};

	const aNodes = placeNodes(awareness, aCx);
	const cNodes = placeNodes(consideration, cCx);

	return (
		<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			<div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
				<div>
					<p className="text-[13px] font-semibold text-gray-900 dark:text-white">
						Customer Journey Map
					</p>
					<p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
						Awareness → Consideration ★ → Destination. Articles build trust; your anchor ranks and sends visitors.
					</p>
				</div>
			</div>

			<div className="overflow-x-auto p-4">
				<svg
					viewBox={`0 0 ${W} ${H}`}
					className="mx-auto w-full"
					style={{ minWidth: 700, maxHeight: 480 }}
				>
					<defs>
						<marker id="ah-flow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
							<polygon points="0 0, 8 3, 0 6" fill="#64748b" />
						</marker>
					</defs>

					{/* ── Main horizontal flow: Awareness → Consideration ───── */}
					<path
						d={`M ${aCx} ${flowY} H ${cCx}`}
						stroke="#1e293b"
						strokeWidth="2"
						fill="none"
					/>
					<path
						d={`M ${aCx} ${flowY} L ${aCx} ${boxTop + 8}`}
						stroke="#1e293b"
						strokeWidth="1.5"
						fill="none"
						opacity="0.6"
					/>
					<path
						d={`M ${cCx} ${flowY} L ${cCx} ${boxTop + 8}`}
						stroke="#1e293b"
						strokeWidth="1.5"
						fill="none"
						opacity="0.6"
					/>

					{/* ── 1. AWARENESS ────────────────────────────────────── */}
					<text x={aCx} y={flowY - 14} textAnchor="middle" fontSize="11" fill="#1d4ed8" fontWeight="700">
						AWARENESS
					</text>
					<text x={aCx} y={flowY - 4} textAnchor="middle" fontSize="8" fill="#64748b">
						Readers finding out they have a problem
					</text>
					<rect
						x={aCx - 100}
						y={boxTop}
						width={200}
						height={boxH}
						rx={10}
						fill={STAGE_COLORS.awareness.bg}
						stroke={STAGE_COLORS.awareness.stroke}
						strokeWidth="2"
					/>
					{awareness.length > 0 ? (
						aNodes.map(({ page, x, y }, idx) => (
							<g
								key={page.id}
								style={{ cursor: 'pointer' }}
								onClick={() => navigate(`/workspace/${page.id}`)}
							>
								<circle cx={x} cy={y} r={nodeR} fill="white" stroke={STAGE_COLORS.awareness.stroke} strokeWidth="2" />
								<text x={x} y={y + 4} textAnchor="middle" fontSize="8" fill={STAGE_COLORS.awareness.text} fontWeight="600">
									{String(idx + 1)}
								</text>
								<text x={x} y={y + 32} textAnchor="middle" fontSize="7" fill="#64748b">
									{(page.title?.slice(0, 14) || '') + (page.title?.length > 14 ? '…' : '')}
								</text>
							</g>
						))
					) : (
						<text x={aCx} y={boxTop + boxH / 2} textAnchor="middle" fontSize="9" fill="#94a3b8">
							+ Add articles
						</text>
					)}

					{/* ── 2. CONSIDERATION ★ ───────────────────────────────── */}
					<text x={cCx} y={flowY - 14} textAnchor="middle" fontSize="11" fill="#b45309" fontWeight="700">
						CONSIDERATION ★
					</text>
					<text x={cCx} y={flowY - 4} textAnchor="middle" fontSize="8" fill="#64748b">
						Readers researching options — this is where you rank
					</text>
					<rect
						x={cCx - 100}
						y={boxTop}
						width={200}
						height={boxH}
						rx={10}
						fill={STAGE_COLORS.consideration.bg}
						stroke={STAGE_COLORS.consideration.stroke}
						strokeWidth="2"
					/>
					{consideration.length > 0 ? (
						cNodes.map(({ page, x, y }, idx) => (
							<g
								key={page.id}
								style={{ cursor: 'pointer' }}
								onClick={() => navigate(`/workspace/${page.id}`)}
							>
								<circle cx={x} cy={y} r={nodeR} fill="white" stroke={STAGE_COLORS.consideration.stroke} strokeWidth="2" />
								<text x={x} y={y + 4} textAnchor="middle" fontSize="8" fill={STAGE_COLORS.consideration.text} fontWeight="600">
									{page.type === 'focus_page' ? '★' : String(idx + 1)}
								</text>
								<text x={x} y={y + 32} textAnchor="middle" fontSize="7" fill="#64748b">
									{(page.title?.slice(0, 14) || '') + (page.title?.length > 14 ? '…' : '')}
								</text>
							</g>
						))
					) : (
						<text x={cCx} y={boxTop + boxH / 2} textAnchor="middle" fontSize="9" fill="#94a3b8">
							+ Add SEO anchor
						</text>
					)}

					{/* ── Flow arrow: Consideration (anchor) → Destination ───── */}
					<path
						d={`M ${cCx} ${boxTop + boxH} V ${destTop - 15} L ${destCx} ${destTop - 15} V ${destTop + 8}`}
						stroke="#64748b"
						strokeWidth="2"
						fill="none"
						markerEnd="url(#ah-flow)"
						opacity="0.8"
					/>
					<text x={(cCx + destCx) / 2} y={destTop - 22} textAnchor="middle" fontSize="8" fill="#64748b">
						visitors sent →
					</text>

					{/* ── 3. DESTINATION (bottom) ─────────────────────────── */}
					<rect
						x={destCx - 100}
						y={destTop}
						width={200}
						height={destH}
						rx={10}
						fill={STAGE_COLORS.destination.bg}
						stroke={STAGE_COLORS.destination.stroke}
						strokeWidth="2"
					/>
					{hasDestination ? (
						<>
							<text x={destCx} y={destTop + 24} textAnchor="middle" fontSize="10" fill={STAGE_COLORS.destination.text} fontWeight="700">
								{(destinationLabel || 'Destination')?.slice(0, 22)}
								{((destinationLabel || 'Destination') ?? '').length > 22 ? '…' : ''}
							</text>
							<text x={destCx} y={destTop + 42} textAnchor="middle" fontSize="8" fill="#64748b">
								Readers ready to act — this is where you convert
							</text>
						</>
					) : (
						<text x={destCx} y={destTop + destH / 2} textAnchor="middle" fontSize="9" fill="#94a3b8">
							+ Connect destination page
						</text>
					)}
				</svg>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
				<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px]">
					<div className="flex items-center gap-1.5">
						<span className="inline-block h-3 w-3 rounded-full" style={{ background: STAGE_COLORS.awareness.stroke }} />
						<span className="text-gray-600 dark:text-gray-400">Awareness</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="inline-block h-3 w-3 rounded-full" style={{ background: STAGE_COLORS.consideration.stroke }} />
						<span className="text-gray-600 dark:text-gray-400">Consideration ★</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="inline-block h-3 w-3 rounded-full" style={{ background: STAGE_COLORS.destination.stroke }} />
						<span className="text-gray-600 dark:text-gray-400">Destination</span>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={onAddArticle}>
						<Plus className="mr-1.5 size-3.5" />
						Add article
					</Button>
					{!hasDestination && (
						<Button size="sm" className="bg-brand-500 hover:bg-brand-600 text-white" onClick={onAddDestination}>
							Connect destination
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
