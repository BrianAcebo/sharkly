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

export const config: Config = {
	smtp: {
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT),
		secure: process.env.SMTP_SECURE === 'true',
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
		from: process.env.SMTP_FROM
	},
	frontendUrl: process.env.FRONTEND_URL
};
