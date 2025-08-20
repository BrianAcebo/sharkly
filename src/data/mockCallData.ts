import { CallContact, CallHistoryEntry, ActiveCall } from '../types/calls';

// Mock Contacts
export const mockContacts: CallContact[] = [
  {
    id: 'contact-1',
    name: 'John Smith',
    phoneNumber: '+1 (555) 123-4567',
    company: 'Acme Corporation',
    email: 'john.smith@acme.com',
    isFavorite: true,
    tags: ['client', 'decision-maker'],
    notes: 'Main contact for enterprise sales',
    lastContact: new Date('2024-01-15T10:30:00Z')
  },
  {
    id: 'contact-2',
    name: 'Sarah Johnson',
    phoneNumber: '+1 (555) 234-5678',
    company: 'TechStart Inc',
    email: 'sarah.j@techstart.com',
    isFavorite: true,
    tags: ['prospect', 'startup'],
    notes: 'Interested in our SaaS solution',
    lastContact: new Date('2024-01-14T14:20:00Z')
  },
  {
    id: 'contact-3',
    name: 'Michael Chen',
    phoneNumber: '+1 (555) 345-6789',
    company: 'Global Solutions',
    email: 'mchen@globalsolutions.com',
    isFavorite: false,
    tags: ['partner', 'enterprise'],
    notes: 'Strategic partnership discussions',
    lastContact: new Date('2024-01-13T09:15:00Z')
  },
  {
    id: 'contact-4',
    name: 'Emily Rodriguez',
    phoneNumber: '+1 (555) 456-7890',
    company: 'Innovation Labs',
    email: 'emily.r@innovationlabs.com',
    isFavorite: false,
    tags: ['prospect', 'research'],
    notes: 'Research collaboration opportunity',
    lastContact: new Date('2024-01-12T16:45:00Z')
  },
  {
    id: 'contact-5',
    name: 'David Thompson',
    phoneNumber: '+1 (555) 567-8901',
    company: 'Future Systems',
    email: 'dthompson@futuresystems.com',
    isFavorite: true,
    tags: ['client', 'enterprise'],
    notes: 'Long-term client, annual renewal coming up',
    lastContact: new Date('2024-01-11T11:00:00Z')
  },
  {
    id: 'contact-6',
    name: 'Lisa Wang',
    phoneNumber: '+1 (555) 678-9012',
    company: 'Digital Dynamics',
    email: 'lisa.wang@digitaldynamics.com',
    isFavorite: false,
    tags: ['prospect', 'mid-market'],
    notes: 'Follow up on demo feedback',
    lastContact: new Date('2024-01-10T13:30:00Z')
  },
  {
    id: 'contact-7',
    name: 'Robert Davis',
    phoneNumber: '+1 (555) 789-0123',
    company: 'Cloud Solutions',
    email: 'rdavis@cloudsolutions.com',
    isFavorite: false,
    tags: ['partner', 'technology'],
    notes: 'Integration partnership discussion',
    lastContact: new Date('2024-01-09T15:20:00Z')
  },
  {
    id: 'contact-8',
    name: 'Jennifer Lee',
    phoneNumber: '+1 (555) 890-1234',
    company: 'NextGen Technologies',
    email: 'jlee@nextgen.com',
    isFavorite: true,
    tags: ['client', 'startup'],
    notes: 'Early adopter, great success story',
    lastContact: new Date('2024-01-08T10:15:00Z')
  },
  {
    id: 'contact-9',
    name: 'Alex Turner',
    phoneNumber: '+1 (555) 901-2345',
    company: 'Innovate Co',
    email: 'aturner@innovateco.com',
    isFavorite: false,
    tags: ['prospect', 'enterprise'],
    notes: 'Enterprise sales opportunity',
    lastContact: new Date('2024-01-07T14:00:00Z')
  },
  {
    id: 'contact-10',
    name: 'Maria Garcia',
    phoneNumber: '+1 (555) 012-3456',
    company: 'TechCorp',
    email: 'mgarcia@techcorp.com',
    isFavorite: false,
    tags: ['client', 'mid-market'],
    notes: 'Support ticket follow-up needed',
    lastContact: new Date('2024-01-06T16:30:00Z')
  }
];

// Mock Call History
export const mockCallHistory: CallHistoryEntry[] = [
  {
    id: 'history-1',
    contactId: 'contact-1',
    contactName: 'John Smith',
    phoneNumber: '+1 (555) 123-4567',
    direction: 'outbound',
    status: 'completed',
    startTime: new Date('2024-01-15T10:30:00Z'),
    endTime: new Date('2024-01-15T10:45:00Z'),
    duration: 900, // 15 minutes
    notes: 'Discussed Q1 renewal and new features'
  },
  {
    id: 'history-2',
    contactId: 'contact-2',
    contactName: 'Sarah Johnson',
    phoneNumber: '+1 (555) 234-5678',
    direction: 'inbound',
    status: 'completed',
    startTime: new Date('2024-01-14T14:20:00Z'),
    endTime: new Date('2024-01-14T14:35:00Z'),
    duration: 900, // 15 minutes
    notes: 'Product demo and pricing discussion'
  },
  {
    id: 'history-3',
    contactId: 'contact-3',
    contactName: 'Michael Chen',
    phoneNumber: '+1 (555) 345-6789',
    direction: 'outbound',
    status: 'missed',
    startTime: new Date('2024-01-13T09:15:00Z'),
    duration: 0,
    notes: 'Left voicemail about partnership opportunity'
  },
  {
    id: 'history-4',
    contactId: 'contact-4',
    contactName: 'Emily Rodriguez',
    phoneNumber: '+1 (555) 456-7890',
    direction: 'inbound',
    status: 'completed',
    startTime: new Date('2024-01-12T16:45:00Z'),
    endTime: new Date('2024-01-12T17:00:00Z'),
    duration: 900, // 15 minutes
    notes: 'Research collaboration discussion'
  },
  {
    id: 'history-5',
    contactId: 'contact-5',
    contactName: 'David Thompson',
    phoneNumber: '+1 (555) 567-8901',
    direction: 'outbound',
    status: 'completed',
    startTime: new Date('2024-01-11T11:00:00Z'),
    endTime: new Date('2024-01-11T11:20:00Z'),
    duration: 1200, // 20 minutes
    notes: 'Annual renewal discussion and upsell opportunity'
  },
  {
    id: 'history-6',
    contactId: 'contact-6',
    contactName: 'Lisa Wang',
    phoneNumber: '+1 (555) 678-9012',
    direction: 'outbound',
    status: 'missed',
    startTime: new Date('2024-01-10T13:30:00Z'),
    duration: 0,
    notes: 'Follow-up call for demo feedback'
  },
  {
    id: 'history-7',
    contactId: 'contact-7',
    contactName: 'Robert Davis',
    phoneNumber: '+1 (555) 789-0123',
    direction: 'inbound',
    status: 'completed',
    startTime: new Date('2024-01-09T15:20:00Z'),
    endTime: new Date('2024-01-09T15:40:00Z'),
    duration: 1200, // 20 minutes
    notes: 'Integration partnership discussion'
  },
  {
    id: 'history-8',
    contactId: 'contact-8',
    contactName: 'Jennifer Lee',
    phoneNumber: '+1 (555) 890-1234',
    direction: 'outbound',
    status: 'completed',
    startTime: new Date('2024-01-08T10:15:00Z'),
    endTime: new Date('2024-01-08T10:25:00Z'),
    duration: 600, // 10 minutes
    notes: 'Success story follow-up and testimonial request'
  },
  {
    id: 'history-9',
    contactId: 'contact-9',
    contactName: 'Alex Turner',
    phoneNumber: '+1 (555) 901-2345',
    direction: 'outbound',
    status: 'declined',
    startTime: new Date('2024-01-07T14:00:00Z'),
    duration: 0,
    notes: 'Call was declined, will follow up via email'
  },
  {
    id: 'history-10',
    contactId: 'contact-10',
    contactName: 'Maria Garcia',
    phoneNumber: '+1 (555) 012-3456',
    direction: 'inbound',
    status: 'completed',
    startTime: new Date('2024-01-06T16:30:00Z'),
    endTime: new Date('2024-01-06T16:45:00Z'),
    duration: 900, // 15 minutes
    notes: 'Support ticket resolution and training'
  },
  {
    id: 'history-11',
    contactId: null,
    contactName: 'Unknown Caller',
    phoneNumber: '+1 (555) 999-8888',
    direction: 'inbound',
    status: 'missed',
    startTime: new Date('2024-01-05T12:00:00Z'),
    duration: 0,
    notes: 'Unknown number, no voicemail left'
  },
  {
    id: 'history-12',
    contactId: null,
    contactName: 'Sales Lead',
    phoneNumber: '+1 (555) 777-6666',
    direction: 'outbound',
    status: 'completed',
    startTime: new Date('2024-01-04T09:00:00Z'),
    endTime: new Date('2024-01-04T09:10:00Z'),
    duration: 600, // 10 minutes
    notes: 'Cold call, interested in demo'
  }
];

// Mock Active Calls
export const mockActiveCalls: ActiveCall[] = [
  {
    id: 'active-1',
    contactId: 'contact-1',
    contactName: 'John Smith',
    phoneNumber: '+1 (555) 123-4567',
    direction: 'outbound',
    status: 'connected',
    startTime: new Date(Date.now() - 300000), // 5 minutes ago
    duration: 300, // 5 minutes
    isMuted: false,
    isSpeakerOn: false,
    isVideoOn: false,
    isRecording: true,
    isOnHold: false,
    notes: 'Q1 renewal discussion'
  },
  {
    id: 'active-2',
    contactId: 'contact-3',
    contactName: 'Michael Chen',
    phoneNumber: '+1 (555) 345-6789',
    direction: 'inbound',
    status: 'connecting',
    startTime: new Date(Date.now() - 60000), // 1 minute ago
    duration: 60, // 1 minute
    isMuted: false,
    isSpeakerOn: false,
    isVideoOn: false,
    isRecording: false,
    isOnHold: false,
    notes: 'Partnership discussion'
  }
];

// Mock Call Settings
export const mockCallSettings = {
  enableRecording: true,
  enableVideo: true,
  enableScreenShare: true,
  defaultMute: false,
  defaultSpeaker: false,
  callTimeout: 30, // 30 seconds
  maxCallDuration: 3600, // 1 hour
  enableCallForwarding: false,
  forwardToNumber: undefined
};



// Helper function to generate random call duration
export const generateRandomDuration = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper function to generate random phone number
export const generateRandomPhoneNumber = (): string => {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `+1 (${areaCode}) ${prefix}-${lineNumber}`;
};

// Helper function to generate mock call history for testing
export const generateMockCallHistory = (count: number): CallHistoryEntry[] => {
  const history: CallHistoryEntry[] = [];
  const directions: Array<'inbound' | 'outbound' | 'missed'> = ['inbound', 'outbound', 'missed'];
  const statuses: Array<'completed' | 'missed' | 'declined' | 'busy'> = ['completed', 'missed', 'declined', 'busy'];
  
  for (let i = 0; i < count; i++) {
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const startTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random time in last 30 days
    const duration = status === 'completed' ? generateRandomDuration(60, 1800) : 0; // 1-30 minutes if completed
    
    history.push({
      id: `generated-history-${i}`,
      contactId: Math.random() > 0.3 ? `contact-${Math.floor(Math.random() * mockContacts.length) + 1}` : undefined,
      contactName: Math.random() > 0.3 ? mockContacts[Math.floor(Math.random() * mockContacts.length)].name : 'Unknown Caller',
      phoneNumber: generateRandomPhoneNumber(),
      direction,
      status,
      startTime,
      endTime: status === 'completed' ? new Date(startTime.getTime() + duration * 1000) : undefined,
      duration,
      notes: Math.random() > 0.5 ? 'Generated mock call data' : undefined
    });
  }
  
  return history.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
};
