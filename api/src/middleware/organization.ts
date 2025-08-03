import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabaseClient';
import { HttpError } from '../error/httpError';

export const organizationRequired = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			throw new HttpError('Authentication required', 401);
		}

		const organizationId = req.body.organization?.id;

		if (!organizationId) {
			throw new HttpError('Organization ID is required', 400);
		}

		// Check if user is a member of the organization
		const { data: teamMember, error } = await supabase
			.from('team_members')
			.select('*')
			.eq('user_id', req.user.id)
			.eq('organization_id', organizationId)
			.single();

		if (error || !teamMember) {
			throw new HttpError('You do not have access to this organization', 403);
		}

		// Add the team member data to the request for use in route handlers
		req.teamMember = teamMember;
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
