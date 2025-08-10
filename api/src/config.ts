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

// Access environment variables in a way Vercel can handle
const env = {
	SMTP_HOST: process.env.SMTP_HOST,
	SMTP_PORT: process.env.SMTP_PORT,
	SMTP_SECURE: process.env.SMTP_SECURE,
	SMTP_USER: process.env.SMTP_USER,
	SMTP_PASS: process.env.SMTP_PASS,
	SMTP_FROM: process.env.SMTP_FROM,
	FRONTEND_URL: process.env.FRONTEND_URL
};

export const config: Config = {
	smtp: {
		host: env.SMTP_HOST,
		port: env.SMTP_PORT ? Number(env.SMTP_PORT) : undefined,
		secure: env.SMTP_SECURE === 'true',
		user: env.SMTP_USER,
		pass: env.SMTP_PASS,
		from: env.SMTP_FROM
	},
	frontendUrl: env.FRONTEND_URL
};
