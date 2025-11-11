import { Router } from 'express';
import { extractExif, ensureImagesBucket, signedUploadUrl, signObjectUrl } from '../controllers/images.js';

const router = Router();

router.post('/exif', extractExif);
router.post('/ensure-bucket', ensureImagesBucket);
router.post('/signed-upload', signedUploadUrl);
router.post('/sign-url', signObjectUrl);

export default router;


