import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ensureAgentNumber } from '../../utils/ensureAgentNumber';

const router = Router();

// Validation schemas
const seatCreatedSchema = z.object({
  agentId: z.string().uuid(),
  areaCode: z.string().regex(/^\d{3}$/).optional()
});

const ensureAgentNumbersSchema = z.object({
  agentIds: z.array(z.string().uuid())
});

// POST /seat-created
router.post('/seat-created', async (req: Request, res: Response) => {
  try {
    const { agentId, areaCode } = seatCreatedSchema.parse(req.body);
    
    console.info(`Seat created for agent ${agentId}, ensuring phone number...`);
    
    const result = await ensureAgentNumber(agentId, { areaCode });
    
    if (result.error) {
      console.error(`Failed to ensure number for agent ${agentId}:`, result.error);
      return res.status(500).json({ error: result.error });
    }
    
    console.info(`Successfully ensured number ${result.phoneNumber} for agent ${agentId}`);
    res.json({ phoneNumber: result.phoneNumber });
    
  } catch (error: unknown) {
    console.error('Error in seat-created hook:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /ensure-agent-numbers
router.post('/ensure-agent-numbers', async (req: Request, res: Response) => {
  try {
    const { agentIds } = ensureAgentNumbersSchema.parse(req.body);
    
    console.info(`Ensuring phone numbers for ${agentIds.length} agents...`);
    
    const results: Record<string, string | { error: string }> = {};
    
    // Process agents in parallel with a concurrency limit
    const concurrencyLimit = 5;
    for (let i = 0; i < agentIds.length; i += concurrencyLimit) {
      const batch = agentIds.slice(i, i + concurrencyLimit);
      
      const batchPromises = batch.map(async (agentId: string) => {
        const result = await ensureAgentNumber(agentId);
        return { agentId, result };
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(({ agentId, result }: { agentId: string; result: { phoneNumber: string; error?: string } }) => {
        if (result.error) {
          results[agentId] = { error: result.error };
        } else {
          results[agentId] = result.phoneNumber;
        }
      });
    }
    
    console.info(`Completed ensuring numbers for ${agentIds.length} agents`);
    res.json({ results });
    
  } catch (error: unknown) {
    console.error('Error ensuring agent numbers:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
