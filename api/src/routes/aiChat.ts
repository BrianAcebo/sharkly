/**
 * AI Chat Routes
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
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

// All routes require authentication
router.use(requireAuth);

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

