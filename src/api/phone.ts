import { api } from '../utils/api';

export const fetchPhoneNumbers = async (orgId: string) => {
  const response = await api.get(`/api/twilio/phone/organizations/${orgId}/phone-numbers`);
  if (!response.ok) {
    throw new Error('Failed to fetch phone numbers');
  }
  return response.json();
};

export const purchasePhoneNumber = async (orgId: string, payload: Record<string, unknown>) => {
  const response = await api.post(`/api/twilio/phone/organizations/${orgId}/phone-numbers`, payload);
  if (!response.ok) {
    throw new Error('Failed to purchase phone number');
  }
  return response.json();
};

export const assignPhoneNumber = async (orgId: string, phoneNumberId: string, payload: Record<string, unknown>) => {
  const response = await api.post(
    `/api/twilio/phone/organizations/${orgId}/phone-numbers/${phoneNumberId}/assign`,
    payload
  );
  if (!response.ok) {
    throw new Error('Failed to assign phone number');
  }
  return response.json();
};

export const releasePhoneNumber = async (orgId: string, phoneNumberId: string) => {
  const response = await api.post(
    `/api/twilio/phone/organizations/${orgId}/phone-numbers/${phoneNumberId}/release`,
    {}
  );
  if (!response.ok) {
    throw new Error('Failed to release phone number');
  }
  return response.json();
};


