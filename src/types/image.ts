export interface ImageRecord {
  image: {
    url: string;
    hash?: { md5?: string; sha256?: string } | null;
    exif?: Record<string, unknown> | null;
    faces_detected?: Array<{ x: number; y: number; w: number; h: number }>;
    reverse_matches?: string[] | null;
  };
}


