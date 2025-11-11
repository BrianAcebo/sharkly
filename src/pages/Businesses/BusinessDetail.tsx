import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import PageMeta from '../../components/common/PageMeta';
import { AuthLoading } from '../../components/AuthLoading';
import { AuthLoadingState } from '../../contexts/AuthContext';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { getBusinessById, updateBusiness, deleteBusiness } from '../../api/businesses';
import type { BusinessRecord } from '../../types/business';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Separator } from '../../components/ui/separator';
import { UserAvatar } from '../../components/common/UserAvatar';
import { formatDistanceToNow } from 'date-fns';
import ComponentCard from '../../components/common/ComponentCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Pencil, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader as AlertHeader,
	AlertDialogTitle
} from '../../components/ui/alert-dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { supabase } from '../../utils/supabaseClient';
import CaseWebMentions from '../../components/cases/CaseWebMentions';
import { Link } from 'react-router-dom';
import LinkedDomainsCard from '../../components/common/LinkedDomainsCard';
import LinkedDocumentsCard from '../../components/common/LinkedDocumentsCard';
import { detachDocumentFromBusiness } from '../../api/documents';
import EntityGraphCard from '../../components/common/EntityGraphCard';

export default function BusinessDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { setTitle, setReturnTo } = useBreadcrumbs();
    const [row, setRow] = useState<BusinessRecord | null>(null);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState<{ name: string; ein: string; avatar: string }>({
        name: '',
        ein: '',
        avatar: ''
    });
    const [editDetailsOpen, setEditDetailsOpen] = useState(false);
    const [editRegistrationOpen, setEditRegistrationOpen] = useState(false);
    const [editOfficersOpen, setEditOfficersOpen] = useState(false);
    const [editAddressesOpen, setEditAddressesOpen] = useState(false);
    const [registrationText, setRegistrationText] = useState('');
    const [officersText, setOfficersText] = useState('');
    const [addressesText, setAddressesText] = useState('');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [linkedDomains, setLinkedDomains] = useState<Array<{ id: string; name: string }>>([]);
    const [linkedDocuments, setLinkedDocuments] = useState<Array<{ id: string; title: string }>>([]);

	useEffect(() => {
		let active = true;
		(async () => {
			if (!id) return;
			const data = await getBusinessById(id);
			if (!active) return;
			setRow(data);
            setDraft({
				name: data.name,
				ein: data.ein_tax_id ?? '',
				avatar: data.avatar ?? ''
			});
            setRegistrationText(data.registration ? JSON.stringify(data.registration, null, 2) : '');
            setOfficersText(Array.isArray(data.officers) ? JSON.stringify(data.officers, null, 2) : '');
            setAddressesText(Array.isArray(data.addresses) ? JSON.stringify(data.addresses, null, 2) : '');
		})();
		return () => {
			active = false;
		};
	}, [id]);

	useEffect(() => {
		if (!row) return;
		setTitle(row.name);
		setReturnTo({ path: '/businesses', label: 'Businesses' });
        setDraft({
			name: row.name,
			ein: row.ein_tax_id ?? '',
			avatar: row.avatar ?? ''
		});
        setRegistrationText(row.registration ? JSON.stringify(row.registration, null, 2) : '');
        setOfficersText(Array.isArray(row.officers) ? JSON.stringify(row.officers, null, 2) : '');
        setAddressesText(Array.isArray(row.addresses) ? JSON.stringify(row.addresses, null, 2) : '');
	}, [row, setTitle, setReturnTo]);

    // Load linked domains (business -> domain) from entity_edges
    useEffect(() => {
        let cancelled = false;
        async function loadDomains() {
            if (!id) return;
            try {
                const { data: edgeRows } = await supabase
                    .from('entity_edges')
                    .select('target_id')
                    .eq('source_type', 'business')
                    .eq('source_id', id)
                    .eq('target_type', 'domain');
                const domainIds = (edgeRows ?? []).map((e: { target_id: string }) => e.target_id);
                if (domainIds.length === 0) {
                    if (!cancelled) setLinkedDomains([]);
                    return;
                }
                const { data } = await supabase.from('domains').select('id, name').in('id', domainIds);
                if (!cancelled) {
                    setLinkedDomains(
                        (data ?? []).map((d) => ({
                            id: (d as { id: string }).id,
                            name: (d as { name?: string }).name ?? ''
                        }))
                    );
                }
            } catch (e) {
                console.error('Failed to load domains for business', e);
                if (!cancelled) setLinkedDomains([]);
            }
        }
        void loadDomains();
        return () => {
            cancelled = true;
        };
    }, [id]);

    useEffect(() => {
        let cancelled = false;
        async function loadDocs() {
            if (!id) return;
            try {
                const { data: edgeRows } = await supabase
                    .from('entity_edges')
                    .select('source_id')
                    .eq('target_type', 'business')
                    .eq('target_id', id)
                    .eq('source_type', 'document');
                const docIds = (edgeRows ?? []).map((e: { source_id: string }) => e.source_id);
                if (docIds.length === 0) {
                    if (!cancelled) setLinkedDocuments([]);
                    return;
                }
                const { data } = await supabase.from('documents').select('id, doc, metadata').in('id', docIds);
                if (!cancelled) {
                    setLinkedDocuments(
                        (data ?? []).map((d: any) => {
                            const t = d?.doc?.type ?? 'document';
                            const a = d?.metadata?.author ?? '';
                            return { id: d.id as string, title: a ? `${t}: ${a}` : t };
                        })
                    );
                }
            } catch (e) {
                console.error('Failed to load documents for business', e);
                if (!cancelled) setLinkedDocuments([]);
            }
        }
        void loadDocs();
        return () => {
            cancelled = true;
        };
    }, [id]);

	if (!row) {
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

    const save = async () => {
		if (!row || !id) return;
		setSaving(true);
		try {
			await updateBusiness(id, {
				name: draft.name,
				ein_tax_id: draft.ein || null,
				avatar: draft.avatar || null
			});
			const refreshed = await getBusinessById(id);
			setRow(refreshed);
			toast.success('Business updated.');
		} catch (e) {
			console.error(e);
			toast.error('Failed to update business.');
		} finally {
			setSaving(false);
		}
	};

	const addressesCount = Array.isArray(row.addresses) ? row.addresses.length : 0;
	const officersCount = Array.isArray(row.officers) ? row.officers.length : 0;
	const domainsCount = Array.isArray(row.domains) ? row.domains.length : 0;

    const toPretty = (v: any) => {
        try {
            if (v == null) return '—';
            return typeof v === 'string' ? v : JSON.stringify(v, null, 2);
        } catch {
            return String(v);
        }
    };

    return (
        <div className="space-y-6 p-6 mx-auto max-w-7xl">
			<PageMeta title={`Business · ${row.name}`} description="Business detail" noIndex />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold mb-2">Business</h1>
					<p className="text-sm text-muted-foreground">{row.name}</p>
				</div>
					<div className="flex items-center gap-2">
						<Button size="sm" variant="outline" onClick={() => navigate(-1)}>
							Back
						</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button size="sm" variant="outline">
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Settings</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => setDeleteOpen(true)}>Delete…</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

            <EntityGraphCard title="Graph" rootType="business" rootId={row.id} />
			<ComponentCard>
				<div className="mb-3 flex items-center justify-between">
					<h3 className="text-lg font-semibold">Details</h3>
					<Button size="sm" variant="outline" onClick={() => setEditDetailsOpen(true)}>
						<Pencil className="size-4" />
					</Button>
				</div>
				<div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <div className="text-sm text-muted-foreground">Name</div>
                            <div className="font-medium">{row.name || '—'}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">EIN / Tax ID</div>
                            <div className="font-medium">{row.ein_tax_id || '—'}</div>
                        </div>
                    </div>
                </div>
			</ComponentCard>

            <LinkedDomainsCard
                title="Domains"
                displayName={row.name}
                ownerId={row.id}
                organizationId={row.organization_id}
                ownerType="business"
                items={linkedDomains.map((d) => ({
                    id: d.id,
                    name: d.name,
                    linkTo: `/domains/${d.id}`
                }))}
                onUnlink={async (domainId) => {
                    try {
                        const { detachDomainFromBusiness } = await import('../../api/domains');
                        await detachDomainFromBusiness(row.id, domainId);
                        setLinkedDomains((prev) => prev.filter((x) => x.id !== domainId));
                        toast.success('Domain unlinked');
                    } catch (e) {
                        console.error('Failed to unlink domain', e);
                        toast.error('Failed to unlink domain.');
                    }
                }}
                onAttached={(d) => {
                    setLinkedDomains((prev) => {
                        const map = new Map(prev.map((x) => [x.id, x]));
                        map.set(d.id, { id: d.id, name: d.name });
                        return Array.from(map.values());
                    });
                }}
            />

            <LinkedDocumentsCard
                title="Documents"
                displayName={row.name}
                ownerId={row.id}
                organizationId={row.organization_id}
                ownerType="business"
                items={linkedDocuments.map((d) => ({ id: d.id, title: d.title, linkTo: `/documents/${d.id}` }))}
                onUnlink={async (documentId) => {
                    try {
                        await detachDocumentFromBusiness(documentId, row.id);
                        setLinkedDocuments((prev) => prev.filter((x) => x.id !== documentId));
                        toast.success('Document unlinked');
                    } catch (e) {
                        console.error('Failed to unlink document', e);
                        toast.error('Failed to unlink document.');
                    }
                }}
                onAttached={(d) => {
                    setLinkedDocuments((prev) => {
                        const map = new Map(prev.map((x) => [x.id, x]));
                        map.set(d.id, { id: d.id, title: d.title });
                        return Array.from(map.values());
                    });
                }}
            />

                <ComponentCard>
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Registration</h3>
                        <Button size="sm" variant="outline" onClick={() => setEditRegistrationOpen(true)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </div>
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{toPretty(row.registration)}</pre>
                </ComponentCard>

                <ComponentCard>
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Officers</h3>
                        <Button size="sm" variant="outline" onClick={() => setEditOfficersOpen(true)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </div>
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{toPretty(row.officers)}</pre>
                </ComponentCard>

                <ComponentCard>
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Addresses</h3>
                        <Button size="sm" variant="outline" onClick={() => setEditAddressesOpen(true)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </div>
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{toPretty(row.addresses)}</pre>
                </ComponentCard>

                {/* Edit dialogs */}
                <Dialog open={editDetailsOpen} onOpenChange={setEditDetailsOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Edit details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium">Name</label>
                                    <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">EIN / Tax ID</label>
                                    <Input value={draft.ein} onChange={(e) => setDraft((d) => ({ ...d, ein: e.target.value }))} />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Avatar URL</label>
                                <Input value={draft.avatar} onChange={(e) => setDraft((d) => ({ ...d, avatar: e.target.value }))} />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setEditDetailsOpen(false)}>Cancel</Button>
                                <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={editRegistrationOpen} onOpenChange={setEditRegistrationOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Edit registration</DialogTitle>
                        </DialogHeader>
                        <Textarea rows={12} value={registrationText} onChange={(e) => setRegistrationText(e.target.value)} />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditRegistrationOpen(false)}>Cancel</Button>
                            <Button onClick={async () => { try { const payload = registrationText.trim() ? JSON.parse(registrationText) : null; const updated = await updateBusiness(id!, { registration: payload }); setRow(updated); setEditRegistrationOpen(false); } catch { /* ignore parse errors shown implicitly by failure */ } }}>{saving ? 'Saving...' : 'Save'}</Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={editOfficersOpen} onOpenChange={setEditOfficersOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Edit officers</DialogTitle>
                        </DialogHeader>
                        <Textarea rows={12} value={officersText} onChange={(e) => setOfficersText(e.target.value)} />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditOfficersOpen(false)}>Cancel</Button>
                            <Button onClick={async () => { try { const payload = officersText.trim() ? JSON.parse(officersText) : []; const updated = await updateBusiness(id!, { officers: payload }); setRow(updated); setEditOfficersOpen(false); } catch {} }}>{saving ? 'Saving...' : 'Save'}</Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={editAddressesOpen} onOpenChange={setEditAddressesOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Edit addresses</DialogTitle>
                        </DialogHeader>
                        <Textarea rows={12} value={addressesText} onChange={(e) => setAddressesText(e.target.value)} />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditAddressesOpen(false)}>Cancel</Button>
                            <Button onClick={async () => { try { const payload = addressesText.trim() ? JSON.parse(addressesText) : []; const updated = await updateBusiness(id!, { addresses: payload }); setRow(updated); setEditAddressesOpen(false); } catch {} }}>{saving ? 'Saving...' : 'Save'}</Button>
                        </div>
                    </DialogContent>
                </Dialog>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertHeader>
                        <AlertDialogTitle>Delete business?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this business and its direct edges. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleting}
                            onClick={async () => {
                                setDeleting(true);
                                try {
                                    await deleteBusiness(id!);
                                    toast.success('Business deleted.');
                                    navigate('/businesses');
                                } catch (e) {
                                    console.error(e);
                                    toast.error('Failed to delete business.');
                                } finally {
                                    setDeleting(false);
                                }
                            }}
                        >
                            {deleting ? 'Deleting…' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="mx-auto mt-6 max-w-7xl">
                <CaseWebMentions entity={{ id: row.id, type: 'business', name: row.name }} allowManage showActions />
            </div>
        </div>
    );
}


