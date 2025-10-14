import { api } from '../utils/api';
import type {
	PhoneNumberListResponse,
	PhoneNumberPurchaseRequest,
	PhoneNumberAssignRequest,
	PhoneNumberRecord
} from '../types/phone';

export const fetchPhoneNumbers = async (orgId: string) => {
    return api.get<PhoneNumberListResponse>(`/api/twilio/organizations/${orgId}/phone-numbers`);
};

export const purchasePhoneNumber = async (orgId: string, payload: PhoneNumberPurchaseRequest) => {
    return api.post<{ number: PhoneNumberRecord }>(`/api/twilio/organizations/${orgId}/phone-numbers`, payload as unknown as Record<string, unknown>);
};

export const assignPhoneNumber = async (orgId: string, phoneNumberId: string, payload: PhoneNumberAssignRequest) => {
    return api.post<{ number: PhoneNumberRecord }>(
        `/api/twilio/organizations/${orgId}/phone-numbers/${phoneNumberId}/assign`,
        payload as unknown as Record<string, unknown>
    );
};

export const releasePhoneNumber = async (orgId: string, phoneNumberId: string) => {
    return api.post<{ ok: boolean }>(
        `/api/twilio/organizations/${orgId}/phone-numbers/${phoneNumberId}/release`,
		{}
	);
};


