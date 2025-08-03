import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabaseClient';
import { HttpError } from '../error/httpError';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
	try {
		// Get the authorization header
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new HttpError('No token provided', 401);
		}

		// Extract the token
		const token = authHeader.split(' ')[1];

		// Verify the session
		const {
			data: { user },
			error
		} = await supabase.auth.getUser(token);

		if (error || !user) {
			throw new HttpError('Invalid token', 401);
		}

		// Add the user to the request object for use in route handlers
		req.user = user;
		next();
	} catch (error) {
		if (error instanceof HttpError) {
			const err = error as { message: string; statusCode: number };
			console.error(`Error ${err.statusCode}: ${err.message}`);
			return res.status(err.statusCode).json({
				error: {
					message: err.message
				}
			});
		} else {
			console.error('An unexpected error occurred:', error);
			return res.status(500).json({
				error: {
					message: 'Internal server error'
				}
			});
		}
	}
};
