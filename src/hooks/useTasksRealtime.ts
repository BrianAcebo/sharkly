import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { Task } from '../types/tasks';

export const useTasksRealtime = (userId?: string, organizationId?: string) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial tasks
  const fetchTasks = useCallback(async () => {
    if (!userId || !organizationId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('owner_id', userId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, organizationId]);

  useEffect(() => {
    if (!userId || !organizationId) return;

    // Initial fetch
    fetchTasks();

    // Subscribe to real-time changes on tasks table
    const subscribeToTasks = () => {
      channelRef.current = supabase
        .channel('tasks')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tasks',
            filter: `owner_id=eq.${userId}`
          },
          (payload) => {
            const newTask = payload.new as Task;
            console.log('New task created:', newTask);
            
            // Add new task to the beginning of the list
            setTasks(prev => [newTask, ...prev]);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tasks',
            filter: `owner_id=eq.${userId}`
          },
          (payload) => {
            const updatedTask = payload.new as Task;
            console.log('Task updated:', updatedTask);
            
            // Update task in the list
            setTasks(prev => prev.map(task => 
              task.id === updatedTask.id ? updatedTask : task
            ));
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'tasks',
            filter: `owner_id=eq.${userId}`
          },
          (payload) => {
            const deletedTask = payload.old as Task;
            console.log('Task deleted:', deletedTask);
            
            // Remove deleted task from the list
            setTasks(prev => prev.filter(task => task.id !== deletedTask.id));
          }
        )
        .subscribe((status) => {
          console.log('Tasks subscription status:', status);
        });
    };

    subscribeToTasks();

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [userId, organizationId, fetchTasks]);

  // Function to manually refresh tasks
  const refreshTasks = () => {
    fetchTasks();
  };

  return { tasks, loading, refreshTasks };
};
