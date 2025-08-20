// API client for Twilio SMS server
const API_BASE_URL = import.meta.env.VITE_TWILIO_API_URL || 'http://localhost:3001';

// Get current user ID from localStorage for development
const getCurrentUserId = (): string => {
  // In production, this would come from your auth context
  return localStorage.getItem('currentUserId') || 'test-user-id';
};

export async function post(url: string, body: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getCurrentUserId(), // For development
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function get(url: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'GET',
    headers: {
      'x-user-id': getCurrentUserId(), // For development
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// SMS-specific API functions
export const smsApi = {
  // Get agent's phone number
  getMyNumber: () => get('/me/number'),
  
  // Buy a new phone number
  buyNumber: (areaCode?: string) => post('/admin/twilio/buy-number', { areaCode }),
  
  // Send an SMS
  sendSms: (to: string, body: string) => post('/api/sms/send', { to, body }),
};

// Voice calling API functions
export const callApi = {
  // Make a phone call
  makeCall: (to: string, from: string) => post('/api/calls/make', { to, from }),
};
