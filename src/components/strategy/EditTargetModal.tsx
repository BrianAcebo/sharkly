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
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import InputField from '../form/input/InputField';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Target, UpdateTargetInput } from '../../types/target';

interface Props {
	open: boolean;
	onClose: () => void;
	target: Target | null;
	onSave: (targetId: string, input: UpdateTargetInput) => Promise<{ error: string | null }>;
}

export function EditTargetModal({ open, onClose, target, onSave }: Props) {
	const [form, setForm] = useState({
		name: '',
		destinationPageUrl: '',
		destinationPageLabel: '',
		seedKeywords: ''
	});
	const [saving, setSaving] = useState(false);

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

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Target</DialogTitle>
					<DialogDescription>Update target name, destination page, and seed keywords.</DialogDescription>
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
						<Label htmlFor="edit-seeds">Seed keywords</Label>
						<InputField
							id="edit-seeds"
							value={form.seedKeywords}
							onChange={(e) => setForm((f) => ({ ...f, seedKeywords: e.target.value }))}
							placeholder="Comma-separated"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button className="bg-brand-500 hover:bg-brand-600" onClick={handleSave} disabled={saving}>
						{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
