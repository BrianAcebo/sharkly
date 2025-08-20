-- Add area_code column to profiles table for phone number area code preferences
-- This allows users to specify their preferred area code during onboarding

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS area_code VARCHAR(3);

-- Add a check constraint to ensure area code is exactly 3 digits
ALTER TABLE profiles 
ADD CONSTRAINT check_area_code_format 
CHECK (area_code IS NULL OR (area_code ~ '^[0-9]{3}$'));

-- Add an index for better performance when querying by area code
CREATE INDEX IF NOT EXISTS idx_profiles_area_code ON profiles(area_code);

-- Add comment for documentation
COMMENT ON COLUMN profiles.area_code IS 'Preferred area code (3 digits) for phone number provisioning during onboarding';
