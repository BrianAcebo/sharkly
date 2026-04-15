/**
 * Edit Target modal — name, destination URL, label, seed keywords
 */

import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription
} from '../ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import InputField from '../form/input/InputField';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Target, UpdateTargetInput } from '../../types/target';
import { TargetIntentGuidance } from './TargetIntentGuidance';

interface Props {
	open: boolean;
	onClose: () => void;
	target: Target | null;
	onSave: (targetId: string, input: UpdateTargetInput) => Promise<{ error: string | null }>;
	onDelete?: (targetId: string) => Promise<{ error: string | null }>;
}

export function EditTargetModal({ open, onClose, target, onSave, onDelete }: Props) {
	const [form, setForm] = useState({
		name: '',
		destinationPageUrl: '',
		destinationPageLabel: '',
		seedKeywords: ''
	});
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

	useEffect(() => {
		if (target) {
			setForm({
				name: target.name,
				destinationPageUrl: target.destinationPageUrl ?? '',
				destinationPageLabel: target.destinationPageLabel ?? '',
				seedKeywords: (target.seedKeywords ?? []).join(', ')
			});
		}
	}, [target, open]);

	const handleSave = async () => {
		if (!target) return;
		const name = form.name.trim();
		if (!name) {
			toast.error('Target name is required');
			return;
		}
		const seeds = form.seedKeywords
			.split(/[,\n]/)
			.map((s) => s.trim())
			.filter(Boolean);
		setSaving(true);
		try {
			const { error } = await onSave(target.id, {
				name,
				destinationPageUrl: form.destinationPageUrl.trim() || undefined,
				destinationPageLabel: form.destinationPageLabel.trim() || undefined,
				seedKeywords: seeds
			});
			if (error) throw new Error(error);
			toast.success('Target updated');
			onClose();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update target');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!target || !onDelete) return;
		setDeleting(true);
		setDeleteConfirmOpen(false);
		try {
			const { error } = await onDelete(target.id);
			if (error) throw new Error(error);
			setDeleteConfirmOpen(false);
			toast.success('Target deleted');
			onClose();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete target');
		} finally {
			setDeleting(false);
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Edit Target</DialogTitle>
						<DialogDescription>
							Update target name, destination page, and seed keywords.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="edit-target-name">Target name</Label>
							<InputField
								id="edit-target-name"
								value={form.name}
								onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
							/>
						</div>
						<div>
							<Label htmlFor="edit-dest-url">Destination page URL</Label>
							<InputField
								id="edit-dest-url"
								type="url"
								value={form.destinationPageUrl}
								onChange={(e) => setForm((f) => ({ ...f, destinationPageUrl: e.target.value }))}
							/>
						</div>
						<div>
							<Label htmlFor="edit-dest-label">Destination page label</Label>
							<InputField
								id="edit-dest-label"
								value={form.destinationPageLabel}
								onChange={(e) => setForm((f) => ({ ...f, destinationPageLabel: e.target.value }))}
							/>
						</div>
						<div>
							<Label htmlFor="edit-seeds">Seed keywords (optional)</Label>
							<InputField
								id="edit-seeds"
								value={form.seedKeywords}
								onChange={(e) => setForm((f) => ({ ...f, seedKeywords: e.target.value }))}
								placeholder="Comma-separated"
							/>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								Comma-separated. Defaults to target name if blank.
								<br></br>
								<br></br>
								Use specific keywords that are relevant to the target. Generic keywords will likely
								throw off the results and lead to topics not related to the target.
							</p>
							<TargetIntentGuidance
								previewOnly
								compact
								className="mt-3"
								name={form.name}
								seedKeywords={form.seedKeywords
									.split(/[,\n]/)
									.map((s) => s.trim())
									.filter(Boolean)}
								destinationPageLabel={form.destinationPageLabel}
								destinationPageUrl={form.destinationPageUrl}
							/>
						</div>
					</div>
					<DialogFooter className="flex-col gap-3 sm:flex-row sm:justify-between">
						<div className="flex w-full justify-between sm:order-2 sm:w-auto">
							<Button variant="outline" onClick={onClose}>
								Cancel
							</Button>
							<Button
								className="bg-brand-500 hover:bg-brand-600"
								onClick={handleSave}
								disabled={saving}
							>
								{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Save
							</Button>
						</div>
						{onDelete && (
							<Button
								variant="ghost"
								className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 sm:order-1 sm:w-auto dark:hover:bg-red-900/20 dark:hover:text-red-400"
								onClick={() => setDeleteConfirmOpen(true)}
								disabled={saving || deleting}
							>
								<Trash2 className="mr-2 size-4" />
								Delete target
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete target?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete &quot;{target?.name}&quot; and all its topics, clusters,
							and related content. This cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-red-600 hover:bg-red-700"
							onClick={(e) => {
								e.preventDefault();
								handleDelete();
							}}
							disabled={deleting}
						>
							{deleting ? 'Deleting…' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
