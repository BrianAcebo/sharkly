export type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed-won' | 'closed-lost';

export const stages: LeadStage[] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'closed-won',
  'closed-lost'
]

export const getStageColor = (stage: LeadStage): string => {
  switch (stage) {
    case 'new':
      return 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100';
    case 'contacted':
      return 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-300';
    case 'qualified':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'proposal':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    case 'closed-won':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'closed-lost':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100';
  }
};

export const getStageLabel = (stage: string) => {
  switch (stage) {
    case 'new':
      return 'New Lead';
    case 'contacted':
      return 'Contacted';
    case 'qualified':
      return 'Qualified';
    case 'proposal':
      return 'Proposal';
    case 'closed-won':
      return 'Closed Won';
    case 'closed-lost':
      return 'Closed Lost';
    default:
      return stage;
  }
};
