export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  action_url?: string;
  metadata: Record<string, unknown>;
  read: boolean;
  read_at?: string;
  shown: boolean;
  created_at: string;
}
