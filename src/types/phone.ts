export type PhoneNumberStatus = 'available' | 'assigned' | 'released';

export interface PhoneNumberRecord {
	id: string;
	sid: string;
	org_id: string;
	seat_id: string | null;
	phone_number: string;
	capabilities: {
		voice?: boolean;
		sms?: boolean;
		mms?: boolean;
	};
	status: PhoneNumberStatus;
	voice_webhook_url?: string | null;
	sms_webhook_url?: string | null;
	created_at: string;
	updated_at: string;
}

export interface PhoneNumberListResponse {
	numbers: PhoneNumberRecord[];
}

export interface PhoneNumberPurchaseRequest {
	areaCode?: string;
	tollFree?: boolean;
	capabilities?: {
		voice?: boolean;
		sms?: boolean;
	};
}

export interface PhoneNumberAssignRequest {
	seatId: string;
}

