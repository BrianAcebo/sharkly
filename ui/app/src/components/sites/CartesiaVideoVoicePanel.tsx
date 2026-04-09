/**
 * Narration voice picker for Site → Video and the video project modal.
 * API: GET /api/video/voices, /api/video/voices/organization, preview, clone.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mic, Play, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../utils/api';
import { SHARKLY_DEFAULT_CARTESIA_VOICE_ID } from '../../lib/cartesiaVideoVoiceConstants';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

export type CartesiaCatalogVoice = {
	id: string;
	name: string;
	subtitle?: string;
	displayName?: string;
	language?: string;
	gender?: string;
	description?: string;
	featured?: boolean;
	featuredOrder?: number;
};

export type OrgCartesiaVoiceRow = {
	id: string;
	cartesia_voice_id: string;
	display_name: string;
	created_at: string;
};

export type CartesiaVideoVoicePanelProps = {
	/**
	 * Voice UUID. Empty string = product default (Blake); persisted as null on the site row.
	 */
	selectedVoiceId: string;
	onSelectedVoiceIdChange: (voiceId: string) => void;
	/**
	 * When false, hide clone upload and org-voice remove UI. Catalog + org voices still appear in the picker.
	 * Use false in the video project modal; true (default) in Site → Video.
	 */
	showVoiceCloneSection?: boolean;
};

function matchesSearch(v: CartesiaCatalogVoice, q: string): boolean {
	if (!q) return true;
	const ql = q.toLowerCase();
	return (
		v.name.toLowerCase().includes(ql) ||
		(v.subtitle?.toLowerCase().includes(ql) ?? false) ||
		(v.displayName?.toLowerCase().includes(ql) ?? false) ||
		(v.language?.toLowerCase().includes(ql) ?? false) ||
		v.id.toLowerCase().includes(ql)
	);
}

/** Ensure the current selection appears when switching tabs (catalog or org clone). */
function withSelectedIfMissing(
	list: CartesiaCatalogVoice[],
	selectedId: string,
	fullCatalog: CartesiaCatalogVoice[],
	orgVoices: OrgCartesiaVoiceRow[]
): CartesiaCatalogVoice[] {
	if (!selectedId || list.some((v) => v.id === selectedId)) return list;
	const fromCat = fullCatalog.find((v) => v.id === selectedId);
	if (fromCat) return [fromCat, ...list];
	const org = orgVoices.find((o) => o.cartesia_voice_id === selectedId);
	if (org) {
		const synthetic: CartesiaCatalogVoice = {
			id: org.cartesia_voice_id,
			name: org.display_name,
			displayName: org.display_name
		};
		return [synthetic, ...list];
	}
	return list;
}

export function CartesiaVideoVoicePanel({
	selectedVoiceId,
	onSelectedVoiceIdChange,
	showVoiceCloneSection = true
}: CartesiaVideoVoicePanelProps) {
	const [catalog, setCatalog] = useState<CartesiaCatalogVoice[]>([]);
	const [orgVoices, setOrgVoices] = useState<OrgCartesiaVoiceRow[]>([]);
	const [catalogLoading, setCatalogLoading] = useState(true);
	const [orgLoading, setOrgLoading] = useState(true);
	const [catalogError, setCatalogError] = useState<string | null>(null);
	const [filter, setFilter] = useState('');
	const [voiceTab, setVoiceTab] = useState<'featured' | 'all' | 'my'>('featured');
	const [previewing, setPreviewing] = useState(false);
	const [cloneName, setCloneName] = useState('');
	const [cloneFile, setCloneFile] = useState<File | null>(null);
	const [cloneSubmitting, setCloneSubmitting] = useState(false);

	const effectiveVoiceId = selectedVoiceId.trim() || SHARKLY_DEFAULT_CARTESIA_VOICE_ID;

	const setSelection = useCallback(
		(id: string) => {
			if (id === SHARKLY_DEFAULT_CARTESIA_VOICE_ID) {
				onSelectedVoiceIdChange('');
			} else {
				onSelectedVoiceIdChange(id);
			}
		},
		[onSelectedVoiceIdChange]
	);

	const loadCatalog = useCallback(async () => {
		setCatalogLoading(true);
		setCatalogError(null);
		try {
			const res = await api.get('/api/video/voices');
			if (!res.ok) {
				const j = (await res.json().catch(() => ({}))) as { error?: string };
				setCatalogError(j.error ?? `HTTP ${res.status}`);
				setCatalog([]);
				return;
			}
			const j = (await res.json()) as { voices?: CartesiaCatalogVoice[] };
			setCatalog(Array.isArray(j.voices) ? j.voices : []);
		} catch {
			setCatalogError('Failed to load voices');
			setCatalog([]);
		} finally {
			setCatalogLoading(false);
		}
	}, []);

	const loadOrg = useCallback(async () => {
		setOrgLoading(true);
		try {
			const res = await api.get('/api/video/voices/organization');
			if (!res.ok) {
				setOrgVoices([]);
				return;
			}
			const j = (await res.json()) as { voices?: OrgCartesiaVoiceRow[] };
			setOrgVoices(Array.isArray(j.voices) ? j.voices : []);
		} catch {
			setOrgVoices([]);
		} finally {
			setOrgLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadCatalog();
		void loadOrg();
	}, [loadCatalog, loadOrg]);

	const filteredFeatured = useMemo(() => {
		const q = filter.trim();
		const base = catalog.filter((v) => v.featured);
		const searched = q ? base.filter((v) => matchesSearch(v, q)) : base;
		return withSelectedIfMissing(searched, effectiveVoiceId, catalog, orgVoices);
	}, [catalog, filter, effectiveVoiceId, orgVoices]);

	const filteredAll = useMemo(() => {
		const q = filter.trim();
		const searched = q ? catalog.filter((v) => matchesSearch(v, q)) : catalog;
		return withSelectedIfMissing(searched, effectiveVoiceId, catalog, orgVoices);
	}, [catalog, filter, effectiveVoiceId, orgVoices]);

	const handlePreview = async () => {
		const id = effectiveVoiceId.trim();
		if (!id) {
			toast.error('Choose a voice first');
			return;
		}
		setPreviewing(true);
		try {
			const res = await api.post('/api/video/voice/preview-audio', {
				voiceId: id,
				text: 'This is a preview of your Sharkly blog to video narration voice.'
			});
			if (!res.ok) {
				const j = (await res.json().catch(() => ({}))) as { error?: string };
				toast.error(j.error ?? 'Preview failed');
				return;
			}
			const j = (await res.json()) as { audioBase64?: string; mimeType?: string };
			if (!j.audioBase64) {
				toast.error('No audio returned');
				return;
			}
			const url = `data:${j.mimeType ?? 'audio/mpeg'};base64,${j.audioBase64}`;
			const audio = new Audio(url);
			await audio.play();
		} catch {
			toast.error('Preview failed');
		} finally {
			setPreviewing(false);
		}
	};

	const handleClone = async () => {
		if (!cloneName.trim()) {
			toast.error('Enter a name for this voice');
			return;
		}
		if (!cloneFile) {
			toast.error('Choose an audio file');
			return;
		}
		setCloneSubmitting(true);
		try {
			const fd = new FormData();
			fd.append('clip', cloneFile);
			fd.append('name', cloneName.trim());
			const res = await api.request('/api/video/voice/clone', { method: 'POST', body: fd });
			if (!res.ok) {
				const j = (await res.json().catch(() => ({}))) as { error?: string; details?: string };
				toast.error(j.error ?? 'Clone failed', { description: j.details?.slice(0, 120) });
				return;
			}
			const j = (await res.json()) as {
				voice?: { cartesia_voice_id: string; display_name: string };
			};
			toast.success('Voice cloned');
			setCloneName('');
			setCloneFile(null);
			await loadOrg();
			setVoiceTab('my');
			if (j.voice?.cartesia_voice_id) {
				onSelectedVoiceIdChange(j.voice.cartesia_voice_id);
			}
		} catch {
			toast.error('Clone failed');
		} finally {
			setCloneSubmitting(false);
		}
	};

	const handleDeleteOrgVoice = async (row: OrgCartesiaVoiceRow) => {
		if (!window.confirm(`Remove cloned voice “${row.display_name}” from your organization?`))
			return;
		try {
			const res = await api.delete(`/api/video/voice/${encodeURIComponent(row.cartesia_voice_id)}`);
			if (!res.ok && res.status !== 204) {
				const j = (await res.json().catch(() => ({}))) as { error?: string };
				toast.error(j.error ?? 'Delete failed');
				return;
			}
			toast.success('Voice removed');
			if (selectedVoiceId.trim() === row.cartesia_voice_id) {
				onSelectedVoiceIdChange('');
			}
			await loadOrg();
		} catch {
			toast.error('Delete failed');
		}
	};

	const renderCatalogItems = (list: CartesiaCatalogVoice[]) =>
		list.map((v) => (
			<SelectItem key={v.id} value={v.id}>
				<span className="flex flex-wrap items-center gap-2">
					<span>
						{v.name}
						{v.subtitle ? (
							<span className="text-muted-foreground"> · {v.subtitle}</span>
						) : null}
						{v.language ? (
							<span className="text-muted-foreground text-xs"> · {v.language}</span>
						) : null}
					</span>
					{v.featured ? (
						<Badge variant="secondary" className="font-normal">
							Popular
						</Badge>
					) : null}
				</span>
			</SelectItem>
		));

	const orgMatches = useMemo(() => {
		const q = filter.trim().toLowerCase();
		if (!q) return orgVoices;
		return orgVoices.filter(
			(o) =>
				o.display_name.toLowerCase().includes(q) || o.cartesia_voice_id.toLowerCase().includes(q)
		);
	}, [orgVoices, filter]);

	/** On “My voices”, only org clones are listed; default/library picks show a placeholder until a clone is chosen. */
	const myTabHasCloneSelected = orgVoices.some((o) => o.cartesia_voice_id === effectiveVoiceId);
	const selectValue =
		voiceTab === 'my'
			? myTabHasCloneSelected
				? effectiveVoiceId
				: undefined
			: effectiveVoiceId;

	return (
		<div className="space-y-6">
			{catalogError && (
				<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-100">
					Voice catalog unavailable ({catalogError}). Narration voices require the voice service to
					be configured on the server. You can still save the site; pick a voice once it&apos;s
					available.
				</div>
			)}

			<div className="space-y-3 rounded-xl border border-gray-200 p-5 dark:border-gray-700">
				<Tabs
					value={voiceTab}
					onValueChange={(v) => setVoiceTab(v as 'featured' | 'all' | 'my')}
					className="w-full"
				>
					<TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
						<TabsTrigger value="featured" className="text-xs sm:text-sm">
							Featured
						</TabsTrigger>
						<TabsTrigger value="all" className="text-xs sm:text-sm">
							All voices
						</TabsTrigger>
						<TabsTrigger value="my" className="text-xs sm:text-sm">
							My voices
						</TabsTrigger>
					</TabsList>

					{voiceTab === 'my' ? (
						<p className="text-muted-foreground mt-3 text-xs leading-relaxed">
							{showVoiceCloneSection ? (
								<>
									This tab lists only voices your team has cloned. Default and library voices are
									under <span className="font-medium">Featured</span> or{' '}
									<span className="font-medium">All voices</span>. Add clones with{' '}
									<span className="font-medium">Clone a new voice</span> below.
								</>
							) : (
								<>
									This tab lists only voices your team has cloned. To create one, open{' '}
									<span className="font-medium">Site detail</span> for this site (Sites → your
									site → edit) and use the <span className="font-medium">Video</span> section to
									clone a narration voice.
								</>
							)}
						</p>
					) : null}

					<div className="mt-4 flex flex-wrap items-end gap-3">
						<div className="min-w-[220px] flex-1">
							<Label htmlFor="video-voice-select">Narration voice</Label>
							<Select value={selectValue} onValueChange={setSelection}>
								<SelectTrigger id="video-voice-select" className="mt-1 h-11">
									<SelectValue
										placeholder={
											voiceTab === 'my' ? 'Choose a cloned voice' : 'Choose a voice'
										}
									/>
								</SelectTrigger>
								<SelectContent className="max-h-[min(320px,50vh)]">
									{voiceTab === 'featured' ? (
										catalogLoading ? (
											<div className="text-muted-foreground px-2 py-2 text-sm">Loading…</div>
										) : (
											renderCatalogItems(filteredFeatured)
										)
									) : voiceTab === 'all' ? (
										<>
											{orgVoices.length > 0 && (
												<>
													<div className="text-muted-foreground px-2 py-1.5 text-[11px] font-semibold uppercase">
														Your voices
													</div>
													{orgVoices.map((o) => (
														<SelectItem key={o.id} value={o.cartesia_voice_id}>
															{o.display_name}{' '}
															<span className="text-muted-foreground text-xs">(cloned)</span>
														</SelectItem>
													))}
												</>
											)}
										<div className="text-muted-foreground px-2 py-1.5 text-[11px] font-semibold uppercase">
											Voice library
										</div>
											{catalogLoading ? (
												<div className="text-muted-foreground px-2 py-2 text-sm">Loading…</div>
											) : (
												renderCatalogItems(filteredAll)
											)}
										</>
									) : (
										<>
											{orgLoading ? (
												<div className="text-muted-foreground px-2 py-2 text-sm">Loading…</div>
											) : orgMatches.length === 0 ? (
												<div className="text-muted-foreground px-2 py-2 text-sm">
													{showVoiceCloneSection
														? 'No cloned voices yet. Use “Clone a new voice” below.'
														: 'No cloned voices yet. Clone one in Site detail → Video.'}
												</div>
											) : (
												orgMatches.map((o) => (
													<SelectItem key={o.id} value={o.cartesia_voice_id}>
														{o.display_name}{' '}
														<span className="text-muted-foreground text-xs">(cloned)</span>
													</SelectItem>
												))
											)}
										</>
									)}
								</SelectContent>
							</Select>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-11"
							disabled={previewing}
							onClick={() => void handlePreview()}
							startIcon={<Play className="size-4" />}
						>
							{previewing ? 'Playing…' : 'Preview'}
						</Button>
					</div>
				</Tabs>

				{voiceTab !== 'my' ? (
					<Input
						placeholder="Search by name, subtitle, or language…"
						value={filter}
						onChange={(e) => setFilter(e.target.value)}
						className="max-w-md"
					/>
				) : null}
			</div>

			{showVoiceCloneSection && orgVoices.length > 0 && (
				<div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
					<h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
						Your cloned voices
					</h3>
					<ul className="space-y-2">
						{orgVoices.map((o) => (
							<li
								key={o.id}
								className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-800/40"
							>
								<span className="truncate">{o.display_name}</span>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="text-error-600 hover:text-error-700 dark:text-error-400 shrink-0"
									onClick={() => void handleDeleteOrgVoice(o)}
									startIcon={<Trash2 className="size-4" />}
								>
									Remove
								</Button>
							</li>
						))}
					</ul>
				</div>
			)}

			{showVoiceCloneSection ? (
				<div className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-gray-700">
					<h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
						<Mic className="size-4" />
						Clone a new voice
					</h3>
					<p className="text-xs text-gray-500 dark:text-gray-400">
						Upload a short recording of your voice to create a custom narration voice. Use a clear
						sample; follow recommended length and quality for voice cloning.
					</p>
					<div className="grid gap-3 sm:max-w-md">
						<div>
							<Label htmlFor="clone-name">Display name</Label>
							<Input
								id="clone-name"
								value={cloneName}
								onChange={(e) => setCloneName(e.target.value)}
								placeholder="e.g. My brand voice"
							/>
						</div>
						<div>
							<Label htmlFor="clone-audio">Audio sample</Label>
							<input
								id="clone-audio"
								type="file"
								accept="audio/wav,audio/x-wav,audio/mpeg,audio/mp3,audio/webm"
								className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm dark:text-gray-400 dark:file:bg-gray-800"
								onChange={(e) => setCloneFile(e.target.files?.[0] ?? null)}
							/>
						</div>
						<Button
							type="button"
							variant="outline"
							disabled={cloneSubmitting || orgLoading}
							onClick={() => void handleClone()}
							startIcon={<Upload className="size-4" />}
						>
							{cloneSubmitting ? 'Uploading…' : 'Clone voice'}
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}

/** @deprecated Use `SiteVideoVoicePanel` — identical component. */
export const SiteVideoVoicePanel = CartesiaVideoVoicePanel;
