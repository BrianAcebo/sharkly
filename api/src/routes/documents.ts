import { Router } from 'express';
import { ensureDocumentsBucket, signedUploadUrl, signObjectUrl } from '../controllers/documents.js';

const router = Router();

router.post('/ensure-bucket', ensureDocumentsBucket);
router.post('/signed-upload', signedUploadUrl);
router.post('/sign-url', signObjectUrl);

export default router;


