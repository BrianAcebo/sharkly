/** Document entity types */

export interface DocumentRecord {
  doc?: { type: string };
  text?: string | null;
  metadata?: Record<string, unknown> | null;
  entities_mentioned?: string[] | null;
  source_url?: string | null;
  retrieved_at?: string | null;
  created_at?: string;
  updated_at?: string;
  title?: string;
}

export interface DocumentEntity {
  id: string;
  organization_id: string;
  doc: DocumentRecord['doc'] | { type: 'other' };
  text: string | null;
  metadata: DocumentRecord['metadata'];
  entities_mentioned: DocumentRecord['entities_mentioned'];
  source_url: DocumentRecord['source_url'];
  retrieved_at: DocumentRecord['retrieved_at'];
  created_at?: string;
  updated_at?: string;
}
