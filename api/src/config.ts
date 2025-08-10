interface Config {
	smtp: {
		host: string;
		port: number;
		secure: boolean;
		user: string;
		pass: string;
		from: string;
	};
	frontendUrl: string;
}

export const config: Config = {
	smtp: {
		host: process.env.SMTP_HOST ? process.env.SMTP_HOST : 'smtp.gmail.com',
		port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
		secure: process.env.SMTP_SECURE === 'true',
		user: process.env.SMTP_USER ? process.env.SMTP_USER : '',
		pass: process.env.SMTP_PASS ? process.env.SMTP_PASS : '',
		from: process.env.SMTP_FROM ? process.env.SMTP_FROM : 'noreply@paperboatcrm.com'
	},
	frontendUrl: process.env.FRONTEND_URL ? process.env.FRONTEND_URL : 'http://localhost:5173'
};
