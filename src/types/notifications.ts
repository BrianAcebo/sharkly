export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  action_url?: string;
  metadata: Record<string, any>;
  read: boolean;
  read_at?: string;
  created_at: string;
}

export interface TaskReminder {
  id: string;
  task_id: string;
  reminder_time: string;
  status: string;
  notification_type: string;
  created_at: string;
  updated_at: string;
}
