import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabaseClient';
import { HttpError } from '../error/httpError';

export const organizationRequired = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user } = req as any;
		if (!user?.id) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const organizationId = req.body.organization?.id;

		if (!organizationId) {
			throw new HttpError('Organization ID is required', 400);
		}

		const { data: membership, error } = await supabase
			.from('user_organizations')
			.select('role, organization_id')
			.eq('user_id', user.id)
			.eq('organization_id', organizationId)
			.single();

		if (error || !membership) {
			throw new HttpError('You do not have access to this organization', 403);
		}

		(res.locals as any).organizationMembership = membership;
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
		}

		console.error('An unexpected error occurred:', error);
		return res.status(500).json({
			error: {
				message: 'Internal server error'
			}
		});
	}
};
