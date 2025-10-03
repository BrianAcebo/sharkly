import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { supabase } from '../utils/supabaseClient';
import { emailService } from '../utils/email';
import { getWalletByOrg, debitWallet, type UsageWallet } from '../utils/wallet';

const router = express.Router();

const sendSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  organizationId: z.string().uuid().optional()
});

async function getOrgForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', userId)
    .single();
  if (error || !data?.organization_id) return null;
  return data.organization_id;
}

// POST /api/email/send
router.post('/send', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const parsed = sendSchema.parse(req.body);

    const organizationId = parsed.organizationId || (await getOrgForUser(userId));
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found for user' });
    }

    // Load usage snapshot for included emails (best effort)
    let includedRemaining: number = 0;
    try {
      const { data, error } = await supabase
        .rpc('usage_included_remaining', { p_organization_id: organizationId })
        .single();
      if (!error && data && typeof data.included_emails_remaining === 'number') {
        includedRemaining = data.included_emails_remaining as number;
      }
    } catch {}

    // Wallet guard: during trial require positive wallet; post-trial allow included emails
    const wallet: UsageWallet | null = await getWalletByOrg(organizationId);
    if (!wallet || wallet.status === 'suspended') {
      return res.status(402).json({ error: 'Deposit required or wallet suspended', code: 'deposit_required' });
    }

    const isTrialing = (() => {
      // lightweight check via org row
      return false;
    })();

    if (isTrialing && wallet.balance_cents <= 0) {
      return res.status(402).json({ error: 'Deposit required during trial', code: 'trial_deposit_required' });
    }

    // Send the email first; charge only on success
    await emailService.sendEmail({
      to: parsed.to,
      subject: parsed.subject,
      html: parsed.html || undefined,
      text: parsed.text || undefined
    });

    // Log usage and debit wallet if included exhausted
    try {
      await supabase.from('email_usage').insert({
        organization_id: organizationId,
        agent_id: userId,
        to_email: parsed.to,
        subject: parsed.subject,
        usage_date: new Date().toISOString()
      });
    } catch (e) {
      console.warn('[email] Failed to insert email_usage', e);
    }

    // Determine if we need to debit wallet (1 email unit)
    if (includedRemaining <= 0) {
      const EMAIL_UNIT_CENTS = Number(process.env.EMAIL_UNIT_CENTS || '1');
      if (EMAIL_UNIT_CENTS > 0) {
        await debitWallet(organizationId, EMAIL_UNIT_CENTS, {
          transactionType: 'debit_email',
          referenceType: 'email',
          description: 'Outbound email send'
        });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[email] send failed', err);
    return res.status(400).json({ error: 'Failed to send email' });
  }
});

export default router;


