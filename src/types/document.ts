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


