/**
 * Chat File Upload Routes
 */

import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import {
  uploadChatFile,
  uploadMultipleChatFiles,
  linkFilesToSession,
  getSessionFiles,
  deleteChatFile,
} from '../controllers/chatFiles.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5,
  },
});

// Upload single file
router.post('/upload', upload.single('file'), uploadChatFile);

// Upload multiple files
router.post('/upload-multiple', upload.array('files', 5), uploadMultipleChatFiles);

// Link files to a session
router.post('/link', linkFilesToSession);

// Get files for a session
router.get('/session/:session_id', getSessionFiles);

// Delete a file
router.delete('/:file_id', deleteChatFile);

export default router;

