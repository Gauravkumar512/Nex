import { Router } from 'express';
import { handleCreateJob, handleGetJob, handleJobStatus } from '../controller/job.controller';
import { verifyaccessToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/', verifyaccessToken, handleCreateJob);
router.get('/', verifyaccessToken, handleGetJob);
router.patch('/:id/status',verifyaccessToken,handleJobStatus)

export default router;
