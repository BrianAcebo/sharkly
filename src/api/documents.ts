import { supabase } from '../utils/supabaseClient';
import type { DocumentEntity, DocumentRecord } from '../types/document';

const mapDoc = (row: Record<string, unknown>): DocumentEntity => {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    doc: (row.doc as DocumentRecord['doc']) ?? { type: 'other' },
    text: (row.text as string | null) ?? null,
    metadata: (row.metadata as DocumentRecord['metadata']) ?? null,
    entities_mentioned: (row.entities_mentioned as DocumentRecord['entities_mentioned']) ?? null,
    source_url: (row.source_url as string | null) ?? null,
    retrieved_at: (row.retrieved_at as string | null) ?? null,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined
  };
};

export async function getDocumentById(id: string): Promise<DocumentEntity> {
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).single();
  if (error) throw error;
  return mapDoc(data as Record<string, unknown>);
}

export async function searchDocuments(organizationId: string, query: string, limit = 24): Promise<Array<{ id: string; title: string }>> {
  let req = supabase
    .from('documents')
    .select('id, organization_id, doc, metadata, source_url')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  const q = query.trim();
  if (q) {
    req = req.or(`text.ilike.%${q}%,source_url.ilike.%${q}%,metadata->>author.ilike.%${q}%`);
  }
  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []).map((r) => {
    const type = ((r.doc as any)?.type as string) ?? 'document';
    const author = ((r.metadata as any)?.author as string | undefined) ?? '';
    const title = author ? `${type}: ${author}` : type;
    return { id: r.id as string, title };
  });
}

export async function createDocument(input: {
  organization_id: string;
  doc: DocumentRecord['doc'];
  text?: string | null;
  metadata?: DocumentRecord['metadata'];
  entities_mentioned?: DocumentRecord['entities_mentioned'];
  source_url?: string | null;
  retrieved_at?: string | null;
}): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      organization_id: input.organization_id,
      doc: input.doc,
      text: input.text ?? null,
      metadata: input.metadata ?? null,
      entities_mentioned: input.entities_mentioned ?? null,
      source_url: input.source_url ?? null,
      retrieved_at: input.retrieved_at ?? new Date().toISOString()
    })
    .select('id')
    .single();
  if (error) throw error;
  return { id: (data?.id as string) ?? '' };
}

export async function updateDocument(id: string, updates: Partial<DocumentRecord>): Promise<DocumentEntity> {
  const payload: Record<string, unknown> = {};
  if (updates.doc) payload.doc = updates.doc;
  if (updates.text !== undefined) payload.text = updates.text ?? null;
  if (updates.metadata !== undefined) payload.metadata = updates.metadata ?? null;
  if (updates.entities_mentioned !== undefined) payload.entities_mentioned = updates.entities_mentioned ?? null;
  if (updates.source_url !== undefined) payload.source_url = updates.source_url ?? null;
  if (updates.retrieved_at !== undefined) payload.retrieved_at = updates.retrieved_at ?? null;
  if (Object.keys(payload).length > 0) {
    const { error } = await supabase.from('documents').update(payload).eq('id', id);
    if (error) throw error;
  }
  return getDocumentById(id);
}

export async function deleteDocument(id: string): Promise<void> {
  await supabase.from('entity_edges').delete().or(`source_id.eq.${id},target_id.eq.${id}`);
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

async function attachEdge(source_type: string, source_id: string, target_type: string, target_id: string, transform_type = 'manual_link') {
  const { data: existing, error: pe } = await supabase
    .from('entity_edges')
    .select('id')
    .eq('source_type', source_type)
    .eq('source_id', source_id)
    .eq('target_type', target_type)
    .eq('target_id', target_id)
    .maybeSingle();
  if (pe) throw pe;
  if (existing) return;
  const { error } = await supabase
    .from('entity_edges')
    .insert({ source_type, source_id, target_type, target_id, transform_type, confidence_score: 1, retrieved_at: new Date().toISOString(), metadata: {} });
  if (error) throw error;
}

async function detachEdge(source_type: string, source_id: string, target_type: string, target_id: string) {
  const { error } = await supabase
    .from('entity_edges')
    .delete()
    .eq('source_type', source_type)
    .eq('source_id', source_id)
    .eq('target_type', target_type)
    .eq('target_id', target_id);
  if (error) throw error;
}

export async function attachDocumentToPerson(documentId: string, personId: string, opts?: { transform_type?: string }) {
  return attachEdge('document', documentId, 'person', personId, opts?.transform_type);
}
export async function detachDocumentFromPerson(documentId: string, personId: string) {
  return detachEdge('document', documentId, 'person', personId);
}
export async function attachDocumentToProperty(documentId: string, propertyId: string, opts?: { transform_type?: string }) {
  return attachEdge('document', documentId, 'property', propertyId, opts?.transform_type);
}
export async function detachDocumentFromProperty(documentId: string, propertyId: string) {
  return detachEdge('document', documentId, 'property', propertyId);
}
export async function attachDocumentToBusiness(documentId: string, businessId: string, opts?: { transform_type?: string }) {
  return attachEdge('document', documentId, 'business', businessId, opts?.transform_type);
}
export async function detachDocumentFromBusiness(documentId: string, businessId: string) {
  return detachEdge('document', documentId, 'business', businessId);
}


