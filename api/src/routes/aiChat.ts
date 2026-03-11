/**
 * AI Chat Routes — V2.6 AI Chat Assistant (Growth+ base, Scale advanced)
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireOrgForChat } from '../middleware/requireOrgForChat.js';
import { requireTier } from '../middleware/requireTier.js';
import { requireFinAddon } from '../middleware/requireFinAddon.js';
import {
  chatWithAssistant,
  chatWithAssistantSync,
  getConversationHistory,
  clearConversation,
  listChatSessions,
  getChatStatus,
  updateChatSession,
} from '../controllers/aiChat.js';

const router = Router();

// All routes require auth + org + Growth tier + Fin add-on (or Scale/Pro)
router.use(requireAuth);
router.use(requireOrgForChat);
router.use(requireTier('growth'));
router.use(requireFinAddon);

// Streaming chat endpoint (SSE)
router.post('/stream', chatWithAssistant);

// Non-streaming chat endpoint
router.post('/message', chatWithAssistantSync);

// List all chat sessions
router.get('/sessions', listChatSessions);

// Get conversation history
router.get('/conversation/:conversation_id', getConversationHistory);

// Update session (rename, pin)
router.patch('/session/:session_id', updateChatSession);

// Clear/archive conversation
router.delete('/conversation/:conversation_id', clearConversation);

// Get chat status/configuration
router.get('/status', getChatStatus);

export default router;

