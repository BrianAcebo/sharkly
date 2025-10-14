import twilio from 'twilio';
import 'dotenv/config';
import { HttpError } from '../error/httpError';

// Twilio environment variables for master account
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

if (!twilioAccountSid || !twilioAuthToken) {
	throw new HttpError('Missing Twilio environment variables', 500);
}

// Initialize Twilio client for master account
export const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

export const getTwilioClientForSubaccount = (params: { accountSid: string; authToken?: string; apiKeySid?: string; apiKeySecret?: string }) => {
    const { accountSid, authToken, apiKeySid, apiKeySecret } = params;
	if (!accountSid) {
		throw new HttpError('Missing subaccount SID', 500);
	}

    // Prefer API key pair when provided (recommended for client tokens and scoped auth)
    if (apiKeySid && apiKeySecret) {
        return twilio(apiKeySid, apiKeySecret, { accountSid });
    }

    // Otherwise allow direct subaccount auth token if supplied
    if (authToken) {
        return twilio(accountSid, authToken);
    }

    // Fallback to parent credentials scoped to the subaccount
    return twilio(twilioAccountSid, twilioAuthToken, { accountSid });
};