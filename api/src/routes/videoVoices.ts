import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import {
	listCartesiaVoices,
	listOrganizationVoices,
	previewCartesiaAudio,
	cloneCartesiaVoice,
	deleteOrganizationVoice
} from '../controllers/cartesiaVideoVoicesController.js';

const router = express.Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 25 * 1024 * 1024 }
});

router.get('/voices', requireAuth, listCartesiaVoices);
router.get('/voices/organization', requireAuth, listOrganizationVoices);
router.post('/voice/preview-audio', requireAuth, previewCartesiaAudio);
router.post('/voice/clone', requireAuth, upload.single('clip'), cloneCartesiaVoice);
router.delete('/voice/:cartesiaVoiceId', requireAuth, deleteOrganizationVoice);

export default router;
