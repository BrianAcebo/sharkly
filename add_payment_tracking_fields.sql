-- Add payment tracking fields to organizations table
-- This migration adds fields to track payment status and dunning state

-- Add payment-related fields to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS payment_action_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dunning_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_payment_failed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_payment_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT;

-- Update the org_status constraint to include new payment-related statuses
ALTER TABLE organizations 
DROP CONSTRAINT IF EXISTS organizations_org_status_check;

ALTER TABLE organizations 
ADD CONSTRAINT organizations_org_status_check 
CHECK (org_status::text = ANY (ARRAY[
  'active'::character varying, 
  'paused'::character varying, 
  'disabled'::character varying, 
  'deleted'::character varying,
  'payment_required'::character varying,
  'past_due'::character varying
]::text[]));

-- Add index for efficient querying of payment-related organizations
CREATE INDEX IF NOT EXISTS idx_organizations_payment_status 
ON organizations (org_status, payment_action_required, dunning_enabled) 
WHERE org_status IN ('payment_required', 'past_due');

-- Add index for payment retry scheduling
CREATE INDEX IF NOT EXISTS idx_organizations_payment_retry 
ON organizations (next_payment_retry_at) 
WHERE org_status IN ('payment_required', 'past_due') AND next_payment_retry_at IS NOT NULL;
