import { Request, Response } from 'express';

export const sendEmail = async (_req: Request, res: Response) => {
  return res.status(501).json({ error: 'Email sending not implemented in this environment.' });
};


