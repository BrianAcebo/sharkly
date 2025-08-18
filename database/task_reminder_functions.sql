-- Function to create a task with associated reminders
CREATE OR REPLACE FUNCTION create_task_with_reminders(
    _owner UUID,
    _organization UUID,
    _title TEXT,
    _description TEXT,
    _due_at TIMESTAMPTZ,
    _due_timezone TEXT,
    _offsets_minutes INTEGER[]
)
RETURNS UUID AS $$
DECLARE
    _task_id UUID;
    _offset_minutes INTEGER;
    _reminder_time TIMESTAMPTZ;
BEGIN
    -- Insert the task
    INSERT INTO tasks (
        title,
        description,
        due_date,
        due_timezone,
        owner_id,
        organization_id,
        status,
        priority,
        type,
        created_at,
        updated_at
    ) VALUES (
        _title,
        _description,
        _due_at,
        _due_timezone,
        _owner,
        _organization,
        'pending',
        'medium',
        'general',
        NOW(),
        NOW()
    ) RETURNING id INTO _task_id;

    -- Create reminders for each offset
    FOREACH _offset_minutes IN ARRAY _offsets_minutes
    LOOP
        -- Calculate reminder time (due time minus offset)
        _reminder_time := _due_at - (INTERVAL '1 minute' * _offset_minutes);
        
        -- Insert reminder
        INSERT INTO task_reminders (
            task_id,
            reminder_time,
            status,
            notification_type,
            created_at,
            updated_at
        ) VALUES (
            _task_id,
            _reminder_time,
            'pending',
            'browser',
            NOW(),
            NOW()
        );
    END LOOP;

    -- Always insert a reminder at the exact due time (if not already present via offset 0)
    IF NOT EXISTS (
        SELECT 1 FROM task_reminders
        WHERE task_id = _task_id AND reminder_time = _due_at
    ) THEN
        INSERT INTO task_reminders (
            task_id,
            reminder_time,
            status,
            notification_type,
            created_at,
            updated_at
        ) VALUES (
            _task_id,
            _due_at,
            'pending',
            'browser',
            NOW(),
            NOW()
        );
    END IF;

    RETURN _task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update a task and regenerate its reminders
CREATE OR REPLACE FUNCTION update_task_and_regenerate_reminders(
    _task_id UUID,
    _new_due TIMESTAMPTZ,
    _due_timezone TEXT,
    _offsets_minutes INTEGER[],
    _title TEXT DEFAULT NULL,
    _description TEXT DEFAULT NULL,
    _priority TEXT DEFAULT NULL,
    _status TEXT DEFAULT NULL,
    _type TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    _offset_minutes INTEGER;
    _reminder_time TIMESTAMPTZ;
BEGIN
    -- Update the task
    UPDATE tasks SET
        title = COALESCE(_title, title),
        description = COALESCE(_description, description),
        due_date = _new_due,
        due_timezone = _due_timezone,
        priority = COALESCE(_priority, priority),
        status = COALESCE(_status, status),
        type = COALESCE(_type, type),
        updated_at = NOW()
    WHERE id = _task_id;

    -- Delete existing pending reminders
    DELETE FROM task_reminders 
    WHERE task_id = _task_id AND status = 'pending';

    -- Create new reminders for each offset
    FOREACH _offset_minutes IN ARRAY _offsets_minutes
    LOOP
        -- Calculate reminder time (due time minus offset)
        _reminder_time := _new_due - (INTERVAL '1 minute' * _offset_minutes);
        
        -- Insert reminder
        INSERT INTO task_reminders (
            task_id,
            reminder_time,
            status,
            notification_type,
            created_at,
            updated_at
        ) VALUES (
            _task_id,
            _reminder_time,
            'pending',
            'browser',
            NOW(),
            NOW()
        );
    END LOOP;

    -- Always insert a reminder at the exact due time (if not already present via offset 0)
    IF NOT EXISTS (
        SELECT 1 FROM task_reminders
        WHERE task_id = _task_id AND reminder_time = _new_due
    ) THEN
        INSERT INTO task_reminders (
            task_id,
            reminder_time,
            status,
            notification_type,
            created_at,
            updated_at
        ) VALUES (
            _task_id,
            _new_due,
            'pending',
            'browser',
            NOW(),
            NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_task_with_reminders(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, INTEGER[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_and_regenerate_reminders(UUID, TIMESTAMPTZ, TEXT, INTEGER[], TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
