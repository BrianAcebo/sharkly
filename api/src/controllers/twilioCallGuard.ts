import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabaseClient';
import { getWalletStatus } from './billingUsage';

export const requireUsageWalletForVoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = req.userId;
    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: membership, error: membershipErr } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', agentId)
      .single();

    if (membershipErr || !membership?.organization_id) {
      return res.status(403).json({ error: 'Agent is not linked to an organization' });
    }

    req.params.organizationId = membership.organization_id;

    const fakeReq = {
      params: req.params,
      query: req.query,
      headers: req.headers,
      get: req.get.bind(req),
      header: req.header.bind(req),
      body: req.body
    } as unknown as Request;

    const responseRecorder: { body?: unknown; status?: number } = {};

    const resClone = {
      json: (body: unknown) => {
        responseRecorder.body = body;
        return {} as Response;
      },
      status: (status: number) => {
        responseRecorder.status = status;
        return resClone as unknown as Response;
      }
    } as Response;

    await getWalletStatus(fakeReq, resClone);
    const statusPayload = responseRecorder.body as { depositRequired?: boolean; reason?: string } | undefined;

    if (statusPayload?.depositRequired) {
      return res.status(402).json({
        error: 'Wallet deposit required',
        walletStatus: statusPayload
      });
    }

    return next();
  } catch (error) {
    console.error('Wallet guard failed:', error);
    return res.status(500).json({ error: 'Failed to validate wallet' });
  }
};

