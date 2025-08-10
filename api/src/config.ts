interface Config {
	smtp: {
		host: string | undefined;
		port: number | undefined;
		secure: boolean;
		user: string | undefined;
		pass: string | undefined;
		from: string | undefined;
	};
	frontendUrl: string | undefined;
}

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpSecure = process.env.SMTP_SECURE;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM;
const frontendUrl = process.env.FRONTEND_URL;

export const config: Config = {
	smtp: {
		host: smtpHost,
		port: smtpPort ? Number(smtpPort) : undefined,
		secure: smtpSecure === 'true',
		user: smtpUser,
		pass: smtpPass,
		from: smtpFrom
	},
	frontendUrl: frontendUrl
};
