/** Image entity types */

export interface ImageRecord {
  hash?: string | null;
  exif?: Record<string, unknown> | null;
  faces_detected?: number | null;
  web_mentions?: unknown;
  image?: { url: string };
  reverse_matches?: string[] | null;
}

export interface ImageEntity {
  id: string;
  organization_id: string;
  title?: string | null;
  description?: string | null;
  source?: 'upload' | 'url' | null;
  image: { url: string };
  hash: ImageRecord['hash'];
  exif: ImageRecord['exif'];
  faces_detected: ImageRecord['faces_detected'];
  reverse_matches?: string[] | null;
  web_mentions: ImageRecord['web_mentions'];
  created_at?: string;
  updated_at?: string;
}
