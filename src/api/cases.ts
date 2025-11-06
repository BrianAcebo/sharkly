import { supabase } from '../utils/supabaseClient';
import { Evidence } from '../types/case';
import { getPersonById } from './people';
import { getBusinessById } from './businesses';
import { formatPersonName, normalizePersonName } from '../utils/person';
import type { Case as CaseType } from '../types/case';
import type { Case, CaseStatus, CasePriority, ListCasesParams } from '../types/case';

export async function listCases(params: ListCasesParams) {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from('cases')
    .select('*', { count: 'exact' })
    .eq('organization_id', params.organizationId)
    .order(params.sortBy === 'alphabetical' ? 'title' : 'created_at', { ascending: params.sortBy === 'alphabetical' ? true : false });

  if (params.archivedOnly) {
    // Only archived
    query = query.not('archived_at', 'is', null);
  } else if (!params.includeArchived) {
    query = query.is('archived_at', null);
  }

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  if (params.priority && params.priority !== 'all') {
    query = query.eq('priority', params.priority);
  }

  if (params.search && params.search.trim().length > 0) {
    const s = `%${params.search.trim()}%`;
    query = query.or(
      ['title.ilike.', 'description.ilike.', 'category.ilike.']
        .map((f) => `${f}${s}`)
        .join(',')
    );
  }

  // Label filtering (e.g., important)
  if ((params as { label?: 'all' | 'important' }).label === 'important') {
    query = query.contains('tags', ['important']);
  }

  if ((params as { category?: string | null }).category) {
    query = query.eq('category', (params as { category?: string | null }).category);
  }

  if ((params as { tag?: string | null }).tag) {
    query = query.contains('tags', [(params as { tag?: string | null }).tag]);
  }

  // Assigned investigator filter
  if ((params as { assignedToId?: string }).assignedToId) {
    query = query.contains('assigned_to', [(params as { assignedToId?: string }).assignedToId as string]);
  }

  if (params.from) {
    query = query.gte('created_at', params.from);
  }
  if (params.to) {
    query = query.lte('created_at', params.to);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  let rows = (data as Case[]) ?? [];

  // Hydrate subject snapshot for list views when missing
  try {
    const personIds: string[] = [];
    const companyIds: string[] = [];
    for (const c of rows) {
      const hasSnapshot = Boolean((c as unknown as { subject?: unknown }).subject);
      const sid = (c as unknown as { subject_id?: string | null }).subject_id ?? null;
      const stype = (c as unknown as { subject_type?: string | null }).subject_type ?? null;
      if (!hasSnapshot && sid && stype) {
        if (stype === 'person') personIds.push(sid);
        else if (stype === 'company') companyIds.push(sid);
      }
    }

    const idToPerson = new Map<string, { name: string; avatar: string | null }>();
    const idToCompany = new Map<string, { name: string }>();

    if (personIds.length > 0) {
      const { data: people } = await supabase
        .from('people')
        .select('id,name,avatar')
        .in('id', Array.from(new Set(personIds)));
      for (const p of (people as Array<{ id: string; name: unknown; avatar: string | null }> | null) ?? []) {
        const normalizedName = normalizePersonName(p.name as Record<string, unknown> | string | null | undefined);
        idToPerson.set(p.id, { name: formatPersonName(normalizedName), avatar: p.avatar ?? null });
      }
    }

    if (companyIds.length > 0) {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id,name,avatar')
        .in('id', Array.from(new Set(companyIds)));
      for (const b of (businesses as Array<{ id: string; name: string; avatar: string | null }> | null) ?? []) {
        idToCompany.set(b.id, { name: b.name as string } as unknown as { name: string });
        // store avatar on a side map by extending type
        (idToCompany as unknown as Map<string, { name: string; avatar: string | null }>).set(b.id, { name: b.name, avatar: b.avatar });
      }
    }

    rows = rows.map((c) => {
      const sid = (c as unknown as { subject_id?: string | null }).subject_id ?? null;
      const stype = (c as unknown as { subject_type?: string | null }).subject_type ?? null;
      const hasSnapshot = Boolean((c as unknown as { subject?: unknown }).subject);
      if (hasSnapshot || !sid || !stype) return c;
      if (stype === 'person' && idToPerson.has(sid)) {
        const p = idToPerson.get(sid)!;
        return { ...(c as unknown as Case), subject: { name: p.name, avatar: p.avatar, type: 'person' } as unknown as Case['subject'] };
      }
      if (stype === 'company' && idToCompany.has(sid)) {
        const b = (idToCompany as unknown as Map<string, { name: string; avatar: string | null }>).get(sid)!;
        return { ...(c as unknown as Case), subject: { name: b.name, avatar: b.avatar ?? null, type: 'company' } as unknown as Case['subject'] };
      }
      return c;
    });
  } catch {
    // Best-effort hydration; ignore failures to keep listing responsive
  }
  // Optional priority sort (client-side small page sort)
  if (params.sortBy === 'priority') {
    const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    rows = [...rows].sort((a, b) => (order[b.priority] ?? 0) - (order[a.priority] ?? 0));
  }
  return { results: rows, total: count ?? 0 };
}

export async function getCaseById(id: string) {
  const { data, error } = await supabase.from('cases').select('*').eq('id', id).single();
  if (error) throw error;
  const row = data as Case;
  if ((row as unknown as CaseType).subject_id) {
    try {
      const stype = (row as unknown as { subject_type?: string | null }).subject_type ?? null;
      if (!stype || stype === 'person') {
        const person = await getPersonById((row as unknown as CaseType).subject_id as string);
        return { ...(row as unknown as CaseType), subject: person as unknown as CaseType['subject'], subject_type: 'person' as unknown as Case['subject_type'] } as Case;
      }
      if (stype === 'company') {
        const biz = await getBusinessById((row as unknown as CaseType).subject_id as string);
        return { ...(row as unknown as CaseType), subject: biz as unknown as CaseType['subject'], subject_type: 'company' as unknown as Case['subject_type'] } as Case;
      }
      console.log('here', row)
      return row as Case;
    } catch {
      return row as Case;
    }
  }
  return row as Case;
}

export interface CreateCaseInput {
  organization_id: string;
  created_by: string;
  title: string;
  description?: string;
  category?: string;
  status?: CaseStatus;
  priority?: CasePriority;
  tags?: string[];
  subject?: Record<string, unknown>;
  subject_id?: string;
  subject_type?: 'person' | 'company';
  assigned_to?: string[];
  graph_id?: string;
}

export async function createCase(input: CreateCaseInput) {
  const payload = {
    organization_id: input.organization_id,
    created_by: input.created_by,
    title: input.title,
    description: input.description ?? null,
    category: input.category ?? null,
    status: input.status ?? 'active',
    priority: input.priority ?? 'low',
    tags: input.tags ?? [],
    subject: input.subject ?? null,
    subject_id: input.subject_id ?? null,
    subject_type: input.subject_type ?? null,
    assigned_to: input.assigned_to ?? [],
    graph_id: input.graph_id ?? null
  };

  const { data, error } = await supabase.from('cases').insert(payload).select('*').single();
  if (error) throw error;
  const row = data as Case;
  // Write audit: case_created
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const actorId = userRes?.user?.id ?? null;
    await supabase.from('case_audit_log').insert({
      case_id: row.id,
      organization_id: row.organization_id,
      actor_id: actorId,
      action: 'case_created',
      entity: 'case',
      entity_id: row.id,
      details: { title: row.title }
    });
  } catch (e) {
    console.warn('case_created audit failed', e);
  }
  return row;
}

export interface UpdateCaseInput {
  title?: string;
  description?: string | null;
  category?: string | null;
  status?: CaseStatus;
  priority?: CasePriority;
  tags?: string[];
  subject?: Record<string, unknown> | null;
  subject_id?: string | null;
  subject_type?: 'person' | 'company' | null;
  assigned_to?: string[];
  graph_id?: string | null;
}

export async function updateCase(id: string, updates: UpdateCaseInput) {
  // Fetch existing for change diff & org/case context
  const { data: before } = await supabase
    .from('cases')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('cases')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  const row = data as Case;
  // Compute changed fields (ignore updated_at)
  try {
    const changed: string[] = [];
    const a = before as unknown as Record<string, unknown>;
    const b = row as unknown as Record<string, unknown>;
    Object.keys(b || {}).forEach((k) => {
      if (k === 'updated_at') return;
      const va = a?.[k];
      const vb = b?.[k];
      if (JSON.stringify(va) !== JSON.stringify(vb)) changed.push(k);
    });
    const { data: userRes } = await supabase.auth.getUser();
    const actorId = userRes?.user?.id ?? null;
    if (changed.length > 0) {
      await supabase.from('case_audit_log').insert({
        case_id: row.id,
        organization_id: row.organization_id,
        actor_id: actorId,
        action: 'case_updated',
        entity: 'case',
        entity_id: row.id,
        details: { changed_fields: changed }
      });
    }
  } catch (e) {
    console.warn('case_updated audit failed', e);
  }
  return row;
}

export async function archiveCase(id: string) {
  const { data, error } = await supabase
    .from('cases')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  const row = data as Case;
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const actorId = userRes?.user?.id ?? null;
    await supabase.from('case_audit_log').insert({
      case_id: row.id,
      organization_id: row.organization_id,
      actor_id: actorId,
      action: 'case_archived',
      entity: 'case',
      entity_id: row.id
    });
  } catch (e) {
    console.warn('case_archived audit failed', e);
  }
  return row;
}

export async function unarchiveCase(id: string) {
  const { data, error } = await supabase
    .from('cases')
    .update({ archived_at: null })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  const row = data as Case;
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const actorId = userRes?.user?.id ?? null;
    await supabase.from('case_audit_log').insert({
      case_id: row.id,
      organization_id: row.organization_id,
      actor_id: actorId,
      action: 'case_unarchived',
      entity: 'case',
      entity_id: row.id
    });
  } catch (e) {
    console.warn('case_unarchived audit failed', e);
  }
  return row;
}

export async function deleteCase(id: string) {
  const { error } = await supabase.from('cases').delete().eq('id', id);
  if (error) throw error;
}

// Case Notes
export interface CaseNote {
  id: string;
  case_id: string;
  organization_id: string;
  author_id: string | null;
  content: string;
  data_source_tags?: string[];
  created_at: string;
  updated_at: string;
}

export async function listCaseNotes(caseId: string) {
  const { data, error } = await supabase
    .from('case_notes')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as CaseNote[]) ?? [];
}

export async function createCaseNote(input: { case_id: string; organization_id: string; author_id: string | null; content: string; data_source_tags?: string[] }) {
  const { data, error } = await supabase
    .from('case_notes')
    .insert({
      case_id: input.case_id,
      organization_id: input.organization_id,
      author_id: input.author_id,
      content: input.content,
      data_source_tags: input.data_source_tags ?? []
    })
    .select('*')
    .single();
  if (error) throw error;
  const note = data as CaseNote;
  // Write audit log
  await supabase.from('case_audit_log').insert({
    case_id: input.case_id,
    organization_id: input.organization_id,
    actor_id: input.author_id,
    action: 'note_created',
    entity: 'case_note',
    entity_id: note.id,
    details: { data_source_tags: input.data_source_tags ?? [] }
  });
  return note;
}

export async function deleteCaseNote(id: string) {
  // Fetch for audit info
  const { data: existing } = await supabase.from('case_notes').select('id,case_id,organization_id').eq('id', id).single();
  const { error } = await supabase.from('case_notes').delete().eq('id', id);
  if (error) throw error;
  if (existing) {
    await supabase.from('case_audit_log').insert({
      case_id: existing.case_id,
      organization_id: existing.organization_id,
      actor_id: null,
      action: 'note_deleted',
      entity: 'case_note',
      entity_id: existing.id
    });
  }
}

// Case Activity (audit log)
export interface CaseAuditEntry {
  id: string;
  case_id: string;
  organization_id: string;
  actor_id: string | null;
  action: string; // e.g., note_created, evidence_uploaded, case_updated
  entity: string; // e.g., case_note, case, case_evidence
  entity_id: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export async function listCaseActivity(caseId: string, actorId?: string) {
  // Only user-authored, case-scoped activity maintained by the app
  let q = supabase
    .from('case_audit_log')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });
  if (actorId) {
    q = q.eq('actor_id', actorId);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data as CaseAuditEntry[]) ?? [];
}

// Evidence
export async function listEvidence(caseId: string) {
  const { data, error } = await supabase
    .from('case_evidence')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Evidence[]) ?? [];
}

function slugifyFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function uploadEvidence(params: {
  organization_id: string;
  case_id: string;
  subject_id?: string | null;
  uploader_id?: string | null;
  files: File[];
}) {
  const results: Evidence[] = [];
  for (const file of params.files) {
    const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
    const uid = g.crypto?.randomUUID
      ? g.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const path = `${params.organization_id}/${params.case_id}/${uid}-${slugifyFileName(file.name)}`;
    const { error: upErr } = await supabase.storage.from('evidence').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream'
    });
    if (upErr) throw new Error(upErr.message || 'Storage upload failed');
    const { data, error } = await supabase
      .from('case_evidence')
      .insert({
        case_id: params.case_id,
        subject_id: params.subject_id ?? null,
        organization_id: params.organization_id,
        uploader_id: params.uploader_id ?? null,
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        storage_path: path
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message || 'Failed to record evidence');
    const ev = data as Evidence;
    results.push(ev);
    // Audit: evidence_uploaded
    try {
      await supabase.from('case_audit_log').insert({
        case_id: params.case_id,
        organization_id: params.organization_id,
        actor_id: params.uploader_id ?? null,
        action: 'evidence_uploaded',
        entity: 'case_evidence',
        entity_id: ev.id,
        details: { file_name: ev.file_name, file_type: ev.file_type, file_size: ev.file_size }
      });
    } catch (e) {
      console.warn('evidence_uploaded audit failed', e);
    }
  }
  return results;
}

export async function deleteEvidence(id: string) {
  const { data: row } = await supabase
    .from('case_evidence')
    .select('id, storage_path')
    .eq('id', id)
    .single();
  const path = row?.storage_path as string | undefined;
  const { error } = await supabase.from('case_evidence').delete().eq('id', id);
  if (error) throw error;
  if (path) {
    await supabase.storage.from('evidence').remove([path]);
  }
  // Best-effort audit (we no longer have case_id/org_id; fetch deleted row prior if needed)
  try {
    const { data: before } = await supabase
      .from('audit_log')
      .select('new_data,old_data')
      .eq('table_name', 'case_evidence')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    const ctx = (before?.old_data || before?.new_data) as unknown as { case_id?: string; organization_id?: string } | null;
    if (ctx?.case_id && ctx?.organization_id) {
      const { data: userRes } = await supabase.auth.getUser();
      await supabase.from('case_audit_log').insert({
        case_id: ctx.case_id,
        organization_id: ctx.organization_id,
        actor_id: userRes?.user?.id ?? null,
        action: 'evidence_deleted',
        entity: 'case_evidence',
        entity_id: id
      });
    }
  } catch (e) {
    console.warn('evidence_deleted audit failed', e);
  }
}

// Category & Tag Catalog APIs
export interface CatalogItem { id: string; name: string; }

export async function listCaseCategories(organizationId: string, search?: string) {
  let q = supabase
    .from('case_category_catalog')
    .select('id,name')
    .eq('organization_id', organizationId)
    .order('name');
  if (search && search.trim()) {
    q = q.ilike('name', `%${search.trim()}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data as CatalogItem[]) ?? [];
}

export async function ensureCaseCategory(organizationId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from('case_category_catalog')
    .upsert({ organization_id: organizationId, name: trimmed }, { onConflict: 'organization_id,name' })
    .select('id,name')
    .single();
  if (error) throw error;
  return data as CatalogItem;
}

export async function listCaseTags(organizationId: string, search?: string) {
  let q = supabase
    .from('case_tag_catalog')
    .select('id,name')
    .eq('organization_id', organizationId)
    .order('name');
  if (search && search.trim()) {
    q = q.ilike('name', `%${search.trim()}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data as CatalogItem[]) ?? [];
}

export async function ensureCaseTags(organizationId: string, names: string[]) {
  const rows = names
    .map((n) => n.trim())
    .filter((n) => n.length > 0)
    .map((n) => ({ organization_id: organizationId, name: n }));
  if (rows.length === 0) return [] as CatalogItem[];
  const { data, error } = await supabase
    .from('case_tag_catalog')
    .upsert(rows, { onConflict: 'organization_id,name' })
    .select('id,name');
  if (error) throw error;
  return (data as CatalogItem[]) ?? [];
}

// Local normalization (trim + collapse spaces)
function normalizeNameLocal(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

// Catalog edit/delete without RPC
export async function renameCaseCategory(organizationId: string, oldName: string, newName: string) {
  const oldN = normalizeNameLocal(oldName);
  const newN = normalizeNameLocal(newName);
  if (oldN.toLowerCase() === newN.toLowerCase()) return;

  // Ensure target exists
  await ensureCaseCategory(organizationId, newN);

  // Update cases category
  const { error: updErr } = await supabase
    .from('cases')
    .update({ category: newN })
    .eq('organization_id', organizationId)
    .eq('category', oldN);
  if (updErr) throw updErr;

  // Remove old catalog entry if different
  await supabase
    .from('case_category_catalog')
    .delete()
    .eq('organization_id', organizationId)
    .eq('name', oldN);
}

export async function deleteCaseCategory(organizationId: string, name: string) {
  const n = normalizeNameLocal(name);
  // Clear from cases
  const { error: updErr } = await supabase
    .from('cases')
    .update({ category: null })
    .eq('organization_id', organizationId)
    .eq('category', n);
  if (updErr) throw updErr;

  // Remove from catalog
  const { error: delErr } = await supabase
    .from('case_category_catalog')
    .delete()
    .eq('organization_id', organizationId)
    .eq('name', n);
  if (delErr) throw delErr;
}

export async function renameCaseTag(organizationId: string, oldName: string, newName: string) {
  const oldN = normalizeNameLocal(oldName);
  const newN = normalizeNameLocal(newName);
  if (oldN.toLowerCase() === newN.toLowerCase()) return;

  // Ensure target exists
  await ensureCaseTags(organizationId, [newN]);

  // Fetch affected cases
  const { data: cases, error } = await supabase
    .from('cases')
    .select('id,tags')
    .eq('organization_id', organizationId)
    .contains('tags', [oldN]);
  if (error) throw error;

  type CaseTagsRow = { id: string; tags: string[] | null };
  for (const c of ((cases as CaseTagsRow[]) ?? [])) {
    const current: string[] = c.tags ?? [];
    const updated = Array.from(new Set(current.map((t) => (t === oldN ? newN : t))));
    if (updated.join('|') !== current.join('|')) {
      const { error: uerr } = await supabase.from('cases').update({ tags: updated }).eq('id', c.id);
      if (uerr) throw uerr;
    }
  }

  // Remove old tag from catalog (optional)
  await supabase
    .from('case_tag_catalog')
    .delete()
    .eq('organization_id', organizationId)
    .eq('name', oldN);
}

export async function deleteCaseTag(organizationId: string, name: string) {
  const n = normalizeNameLocal(name);
  // Fetch affected cases
  const { data: cases, error } = await supabase
    .from('cases')
    .select('id,tags')
    .eq('organization_id', organizationId)
    .contains('tags', [n]);
  if (error) throw error;

  type CaseTagsRow = { id: string; tags: string[] | null };
  for (const c of ((cases as CaseTagsRow[]) ?? [])) {
    const current: string[] = c.tags ?? [];
    const updated = current.filter((t) => t !== n);
    if (updated.length !== current.length) {
      const { error: uerr } = await supabase.from('cases').update({ tags: updated }).eq('id', c.id);
      if (uerr) throw uerr;
    }
  }

  // Remove from catalog
  const { error: delErr } = await supabase
    .from('case_tag_catalog')
    .delete()
    .eq('organization_id', organizationId)
    .eq('name', n);
  if (delErr) throw delErr;
}


