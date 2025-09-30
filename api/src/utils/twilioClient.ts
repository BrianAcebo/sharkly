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

export const getTwilioClientForSubaccount = (params: { accountSid: string; authToken?: string }) => {
	const { accountSid, authToken } = params;
	if (!accountSid) {
		throw new HttpError('Missing subaccount SID', 500);
	}

	if (!authToken) {
		// Fallback to master auth token if subaccount auth token is not provided
		return twilio(twilioAccountSid, twilioAuthToken, { accountSid });
	}

	return twilio(accountSid, authToken);
};