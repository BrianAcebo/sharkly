interface Config {
	smtp: {
		host?: string;
		port?: number;
		secure: boolean;
		user?: string;
		pass?: string;
		from?: string;
	};
	frontendUrl?: string;
}

const SMTP_HOST = process.env.SMTP_HOST ?? 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM ?? SMTP_USER;
const FRONTEND_URL = process.env.FRONTEND_URL;

export const config: Config = {
	smtp: {
		host: SMTP_HOST,
		port: SMTP_PORT,
		secure: SMTP_SECURE,
		user: SMTP_USER,
		pass: SMTP_PASS,
		from: SMTP_FROM
	},
	frontendUrl: FRONTEND_URL
};
