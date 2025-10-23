export const fetchPhoneNumbers = async (orgId: string) => {
  const response = await fetch(`/api/twilio/phone/organizations/${orgId}/phone-numbers`);
  if (!response.ok) {
    throw new Error('Failed to fetch phone numbers');
  }
  return response.json();
};

export const purchasePhoneNumber = async (orgId: string, payload: Record<string, unknown>) => {
  const response = await fetch(`/api/twilio/phone/organizations/${orgId}/phone-numbers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error('Failed to purchase phone number');
  }
  return response.json();
};

export const assignPhoneNumber = async (orgId: string, phoneNumberId: string, payload: Record<string, unknown>) => {
  const response = await fetch(`/api/twilio/phone/organizations/${orgId}/phone-numbers/${phoneNumberId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error('Failed to assign phone number');
  }
  return response.json();
};

export const releasePhoneNumber = async (orgId: string, phoneNumberId: string) => {
  const response = await fetch(`/api/twilio/phone/organizations/${orgId}/phone-numbers/${phoneNumberId}/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    throw new Error('Failed to release phone number');
  }
  return response.json();
};


