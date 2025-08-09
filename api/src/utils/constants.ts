// Lead Stage Options
export const LEAD_STAGES = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  PROPOSAL: 'proposal',
  CLOSED_WON: 'closed-won',
  CLOSED_LOST: 'closed-lost'
} as const;

export type LeadStage = typeof LEAD_STAGES[keyof typeof LEAD_STAGES];

// Lead Priority Options
export const LEAD_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export type LeadPriority = typeof LEAD_PRIORITIES[keyof typeof LEAD_PRIORITIES];

// Lead Status Options
export const LEAD_STATUSES = {
  ACTIVE: 'active',
  IN_PROGRESS: 'in_progress',
  CLOSED: 'closed'
} as const;

export type LeadStatus = typeof LEAD_STATUSES[keyof typeof LEAD_STATUSES];

// Date Range Options
export const DATE_RANGES = {
  ALL: 'all',
  LAST_7_DAYS: 'last7days',
  LAST_30_DAYS: 'last30days',
  LAST_90_DAYS: 'last90days',
  CUSTOM: 'custom'
} as const;

export type DateRange = typeof DATE_RANGES[keyof typeof DATE_RANGES]; 