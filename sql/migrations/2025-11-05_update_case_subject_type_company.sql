-- Normalize cases.subject_type values to 'company'
UPDATE cases
SET subject_type = 'company'
WHERE subject_type = 'business';
