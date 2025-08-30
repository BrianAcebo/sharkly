import { supabase } from '../utils/supabaseClient';

export interface CreateTaskWithRemindersParams {
  ownerId: string;
  organizationId?: string;
  title: string;
  description?: string;
  dueAtUtc: string; // UTC ISO string
  dueTimezone: string; // IANA timezone
  offsetsMinutes: number[]; // e.g., [5, 15, 30, 60, 1440]
}

export interface UpdateTaskAndRemindersParams {
  taskId: string;
  dueAtUtc: string; // UTC ISO string
  dueTimezone: string; // IANA timezone
  offsetsMinutes: number[]; // e.g., [5, 15, 30, 60, 1440]
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  type?: 'follow_up' | 'proposal' | 'meeting' | 'call' | 'email' | 'general';
}

/**
 * Creates a task with associated reminders using the RPC function
 */
export const createTaskWithReminders = async (params: CreateTaskWithRemindersParams) => {
  try {
    const {
      ownerId,
      organizationId,
      title,
      description = '',
      dueAtUtc,
      dueTimezone,
      offsetsMinutes
    } = params;

    // Call the RPC function
    const { data, error } = await supabase.rpc('create_task_with_reminders', {
      _owner: ownerId,
      _organization: organizationId || null,
      _title: title,
      _description: description || null,
      _due_at: dueAtUtc,
      _due_timezone: dueTimezone,
      _offsets_minutes: offsetsMinutes
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Updates a task and regenerates its reminders using the RPC function
 */
export const updateTaskAndReminders = async (params: UpdateTaskAndRemindersParams) => {
  try {
    const {
      taskId,
      dueAtUtc,
      dueTimezone,
      offsetsMinutes,
      title,
      description,
      priority,
      status,
      type
    } = params;

    // Call the RPC function
    const { data, error } = await supabase.rpc('update_task_and_regenerate_reminders', {
      _task_id: taskId,
      _new_due: dueAtUtc,
      _due_timezone: dueTimezone,
      _offsets_minutes: offsetsMinutes,
      _title: title || null,
      _description: description || null,
      _priority: priority || null,
      _status: status || null,
      _type: type || null
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};
