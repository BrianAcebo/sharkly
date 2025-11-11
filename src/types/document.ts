export type DocumentType = 'court' | 'filing' | 'pdf' | 'other';

export interface DocumentRecord {
  id?: string;
  organization_id?: string;
  doc: {
    type: DocumentType;
  };
  text?: string | null;
  metadata?: {
    author?: string | null;
    date?: string | null;
  } | null;
  entities_mentioned?: {
    names?: string[] | null;
    emails?: string[] | null;
    addresses?: string[] | null;
  } | null;
  source_url?: string | null;
  retrieved_at?: string | null;
}

export interface DocumentEntity extends DocumentRecord {
  id: string;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
}

export type DocumentType = 'court' | 'filing' | 'pdf' | string;

export interface DocumentRecord {
  id?: string;
  organization_id?: string;
  doc: {
    type: DocumentType;
  };
  text?: string | null;
  metadata?: {
    author?: string | null;
    date?: string | null;
  } | null;
  entities_mentioned?: {
    names?: string[] | null;
    emails?: string[] | null;
    addresses?: string[] | null;
  } | null;
  source_url?: string | null;
  retrieved_at?: string | null;
}

export interface DocumentEntity extends DocumentRecord {
  id: string;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentRecord {
  doc: {
    id?: string | null;
    kind?: string | null; // 'court', 'filing', 'pdf'
    text?: string | null;
    metadata?: Record<string, unknown> | null;
    entities_mentioned?: string[] | null;
    source_url?: string | null;
    retrieved_at?: string | null;
  };
}


