/** Entity graph types for FloatingEdgesGraph */

export type EntityType =
  | 'person'
  | 'business'
  | 'email'
  | 'phone'
  | 'username'
  | 'social_profile'
  | 'domain'
  | 'property'
  | 'ip'
  | 'image'
  | 'document'
  | 'leak';

export interface EntityNode {
  id: string;
  type: string;
  data?: Record<string, unknown>;
}

export interface EntityEdge {
  id: string;
  source: string;
  target: string;
  data?: Record<string, unknown>;
}
