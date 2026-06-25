import { Router } from 'express';
import {
  handleCreateJob,
  handleEmail,
  handleEmailStream,
  handleGetJob,
  handleJobStatus,
} from '../controller/job.controller';
import { verifyAccessToken } from '../middleware/auth.middleware';
import { aiLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/', verifyAccessToken, aiLimiter, handleCreateJob);
router.get('/', verifyAccessToken, handleGetJob);
router.patch('/:id/status', verifyAccessToken, handleJobStatus);
router.post('/:id/draft-email', verifyAccessToken, aiLimiter, handleEmail);
router.get('/:id/email-stream', verifyAccessToken, handleEmailStream);

export default router;
