import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { 
  getVerificationStatus,
  saveBrand,
  saveCampaign,
  submit10DLC,
  submitTollFree,
  refreshStatus
} from '../controllers/smsVerification.js';

const router = express.Router();

// All SMS verification routes require authentication
router.use(requireAuth);

// Get verification status for an organization
router.get('/verification-status', getVerificationStatus);

// Save brand profile
router.post('/save-brand', saveBrand);

// Save campaign profile
router.post('/save-campaign', saveCampaign);

// Submit 10DLC application
router.post('/submit-10dlc', submit10DLC);

// Submit Toll-Free verification
router.post('/submit-tollfree', submitTollFree);

// Refresh verification status
router.post('/refresh-status', refreshStatus);

export default router;
