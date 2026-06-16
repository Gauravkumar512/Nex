import { Router } from 'express';
import { getProfile, uploadResume } from '../controller/profile.controller';
import { verifyaccessToken } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.post('/upload', verifyaccessToken, upload.single('resume'), uploadResume);
router.get('/', verifyaccessToken, getProfile);

export default router;
