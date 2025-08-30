import twilio from 'twilio';
import 'dotenv/config';
import { HttpError } from '../error/httpError';

// Twilio environment variables
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

if (!twilioAccountSid || !twilioAuthToken) {
	throw new HttpError('Missing Twilio environment variables', 500);
}

// Initialize Twilio client
export const twilioClient = twilio(
    twilioAccountSid,
    twilioAuthToken
);