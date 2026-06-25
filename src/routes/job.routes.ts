import { Router } from 'express';
import {
  handleCreateJob,
  handleEmail,
  handleEmailStream,
  handleGetJob,
  handleJobStatus,
} from '../controller/job.controller';
import { verifyaccessToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/', verifyaccessToken, handleCreateJob);
router.get('/', verifyaccessToken, handleGetJob);
router.patch('/:id/status', verifyaccessToken, handleJobStatus);
router.post('/:id/draft-email', verifyaccessToken, handleEmail);
router.get('/:id/email-stream', verifyaccessToken, handleEmailStream);

export default router;
