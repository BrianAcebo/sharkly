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

export interface UpdateTaskWithRemindersParams {
  taskId: string;
  ownerId: string;
  organizationId: string;
  title: string;
  description?: string;
  dueAtUtc: string; // ISO string
  offsetsMinutes: number[]; // e.g., [5, 15, 30, 60] for 5min, 15min, 30min, 1hr reminders
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  type?: 'follow_up' | 'proposal' | 'meeting' | 'call' | 'email' | 'general';
}

export const updateTaskWithReminders = async (params: UpdateTaskWithRemindersParams) => {
  try {
    const {
      taskId,
      ownerId,
      title,
      description = '',
      dueAtUtc,
      offsetsMinutes,
      priority = 'medium',
      type = 'general'
    } = params;

    // 1. Update the task
    const { error: taskError } = await supabase
      .from('tasks')
      .update({
        title,
        description,
        priority,
        type,
        due_date: dueAtUtc,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .eq('owner_id', ownerId); // Ensure user can only update their own tasks

    if (taskError) {
      throw new Error(`Failed to update task: ${taskError.message}`);
    }

    console.log('✅ Task updated:', taskId);

    // 2. Delete existing reminders
    const { error: deleteRemindersError } = await supabase
      .from('task_reminders')
      .delete()
      .eq('task_id', taskId);

    if (deleteRemindersError) {
      console.error('Failed to delete existing reminders:', deleteRemindersError);
      // Continue anyway, as the task was updated
    }

    // 3. Create new reminders for each offset
    if (offsetsMinutes.length > 0) {
      const reminderPromises = offsetsMinutes.map(async (offsetMinutes) => {
        const reminderTime = new Date(new Date(dueAtUtc).getTime() - offsetMinutes * 60 * 1000);
        
        const { error: reminderError } = await supabase
          .from('task_reminders')
          .insert({
            task_id: taskId,
            reminder_time: reminderTime.toISOString(),
            status: 'pending',
            notification_type: 'browser'
          });

        if (reminderError) {
          console.error(`Failed to create ${offsetMinutes}min reminder:`, reminderError);
          return null;
        }

        console.log(`✅ ${offsetMinutes}min reminder created for task:`, taskId);
        return { offsetMinutes, reminderTime: reminderTime.toISOString() };
      });

      const reminderResults = await Promise.all(reminderPromises);
      const successfulReminders = reminderResults.filter(Boolean);
      
      console.log(`✅ Created ${successfulReminders.length} reminders for task:`, taskId);
    }

    return { success: true, taskId };
  } catch (error) {
    console.error('Error updating task with reminders:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
