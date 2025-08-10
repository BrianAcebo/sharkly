interface Config {
	smtp: {
		host: string;
		port: number;
		secure: boolean;
		user?: string;
		pass?: string;
		from: string;
	};
	frontendUrl?: string;
}

const config: Config = {
	smtp: {
		host: process.env.SMTP_HOST || 'smtp.gmail.com',
		port: parseInt(process.env.SMTP_PORT || '587', 10),
		secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '587', 10) === 465,
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
		from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@paperboatcrm.com'
	},
	frontendUrl: process.env.FRONTEND_URL
};

export { config };
