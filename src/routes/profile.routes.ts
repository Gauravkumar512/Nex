import { Router } from 'express';
import { getProfile, uploadResume } from '../controller/profile.controller';
import { verifyAccessToken } from '../middleware/auth.middleware';
import { aiLimiter } from '../middleware/rateLimiter';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.post('/upload', verifyAccessToken, aiLimiter, upload.single('resume'), uploadResume);
router.get('/', verifyAccessToken, getProfile);

export default router;
