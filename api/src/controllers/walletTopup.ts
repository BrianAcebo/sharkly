import { Request, Response } from 'express';
import { createTopUpPaymentIntent } from '../utils/walletTopup.js';

export const postWalletTopup = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { organizationId, amountCents, currency, paymentMethodId } = req.body as {
      organizationId?: string;
      amountCents?: number;
      currency?: string;
      paymentMethodId?: string;
    };

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const result = await createTopUpPaymentIntent({
      organizationId,
      amountCents,
      currency,
      paymentMethodId
    });

    return res.json({
      client_secret: result.clientSecret,
      payment_intent_id: result.paymentIntentId,
      wallet: result.wallet
    });
  } catch (error) {
    console.error('wallet topup error', error);
    return res.status(500).json({ error: 'Failed to create top-up' });
  }
};


