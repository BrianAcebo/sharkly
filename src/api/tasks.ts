import { supabase } from '../utils/supabaseClient';

export interface CreateTaskWithRemindersParams {
  ownerId: string;
  organizationId: string;
  title: string;
  description?: string;
  dueAtUtc: string; // ISO string
  offsetsMinutes: number[]; // e.g., [5, 15, 30, 60] for 5min, 15min, 30min, 1hr reminders
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  type?: 'follow_up' | 'proposal' | 'meeting' | 'call' | 'email' | 'general';
}

export const createTaskWithReminders = async (params: CreateTaskWithRemindersParams) => {
  try {
    const {
      ownerId,
      organizationId,
      title,
      description = '',
      dueAtUtc,
      offsetsMinutes,
      priority = 'medium',
      type = 'general'
    } = params;

    // 1. Create the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        status: 'pending',
        priority,
        type,
        due_date: dueAtUtc,
        owner_id: ownerId,
        organization_id: organizationId
      })
      .select()
      .single();

    if (taskError) {
      throw new Error(`Failed to create task: ${taskError.message}`);
    }

    console.log('✅ Task created:', task.id);

    // 2. Create reminders for each offset
    if (offsetsMinutes.length > 0) {
      const reminderPromises = offsetsMinutes.map(async (offsetMinutes) => {
        const reminderTime = new Date(new Date(dueAtUtc).getTime() - offsetMinutes * 60 * 1000);
        
        const { error: reminderError } = await supabase
          .from('task_reminders')
          .insert({
            task_id: task.id,
            reminder_time: reminderTime.toISOString(),
            status: 'pending',
            notification_type: 'browser'
          });

        if (reminderError) {
          console.error(`Failed to create ${offsetMinutes}min reminder:`, reminderError);
          return null;
        }

        console.log(`✅ ${offsetMinutes}min reminder created for task:`, task.id);
        return { offsetMinutes, reminderTime: reminderTime.toISOString() };
      });

      const reminderResults = await Promise.all(reminderPromises);
      const successfulReminders = reminderResults.filter(Boolean);
      
      console.log(`✅ Created ${successfulReminders.length} reminders for task:`, task.id);
    }

    return { success: true, taskId: task.id };
  } catch (error) {
    console.error('Error creating task with reminders:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};



export async function updateTaskAndReminders({
  taskId, dueAtUtc, offsetsMinutes, title, description, priority, status, type
}: {
  taskId: string;
  dueAtUtc: string;             // ISO UTC string
  offsetsMinutes: number[];     // e.g. [5,10,15]
  title?: string; 
  description?: string; 
  priority?: string; 
  status?: string; 
  type?: string;
}) {
  const { error } = await supabase.rpc('update_task_and_regenerate_reminders', {
    _task_id: taskId,
    _new_due: dueAtUtc,
    _offsets_minutes: offsetsMinutes,
    _title: title ?? null,
    _description: description ?? null,
    _priority: priority ?? null,
    _status: status ?? null,
    _type: type ?? null,
  });
  if (error) throw error;
}
