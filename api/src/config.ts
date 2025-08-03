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
		host: 'smtp.gmail.com',
		port: 587,
		secure: false,
		user: '',
		pass: '',
		from: 'noreply@truesight.com'
	},
	frontendUrl: 'http://localhost:5173'
};
