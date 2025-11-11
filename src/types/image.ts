export interface ImageExif {
  // Identity and provenance
  timestamp?: string | null;
  gps?: { lat?: number | null; lon?: number | null; alt?: number | null } | null;
  make?: string | null;
  model?: string | null;
  device?: string | null; // convenience summary of make/model
  lens?: string | null;
  software?: string | null;
  imageId?: string | null;
  serialNumber?: string | null;
  owner?: string | null;
  copyright?: string | null;
  caption?: string | null;
  keywords?: string[] | null;

  // Capture context
  exposure?: {
    time?: number | string | null; // ExposureTime
    aperture?: number | null; // FNumber
    iso?: number | null; // ISO/ISOSpeedRatings
    focalLength?: number | null;
    focalLength35mm?: number | null;
    meteringMode?: number | string | null;
    exposureProgram?: number | string | null;
    exposureMode?: number | string | null;
  } | null;
  whiteBalance?: number | string | null;
  flashFired?: boolean | null;
  orientation?: number | null;

  // Heuristic flags
  edited?: boolean | null;

  // Raw EXIF subset if we want to retain for audit
  raw?: Record<string, unknown> | null;
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageRecord {
  id?: string;
  organization_id?: string;
  title?: string | null;
  description?: string | null;
  source?: 'upload' | 'url' | null;
  image: {
    url: string;
  };
  hash?: {
    md5?: string | null;
    sha256?: string | null;
  } | null;
  exif?: ImageExif | null;
  faces_detected?: FaceBox[] | null;
  reverse_matches?: string[] | null;
  web_mentions?: Array<{ title?: string | null; link?: string | null; snippet?: string | null; found_at?: string | null }> | null;
}

export interface ImageEntity extends ImageRecord {
  id: string;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ImageRecord {
  image: {
    url: string;
    hash?: { md5?: string; sha256?: string } | null;
    exif?: Record<string, unknown> | null;
    faces_detected?: Array<{ x: number; y: number; w: number; h: number }>;
    reverse_matches?: string[] | null;
  };
}


