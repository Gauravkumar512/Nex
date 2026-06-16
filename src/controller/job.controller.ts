import { JobStatus } from '@prisma/client';
import { NextFunction, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createJobSchema } from '../schemas/job.schema';
import { createJob, getJobs, updateJobStatus } from '../services/job.service';

const updateStatusSchema = z.object({
  status: z.nativeEnum(JobStatus),
});

export async function handleCreateJob(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const validation = createJobSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ message: 'Invalid job data', errors: validation.error.issues });
    return;
  }

  try {
    const job = await createJob(req.userId!, validation.data);
    res.status(201).json({ message: 'Job added', job });
  } catch (error) {
    next(error);
  }
}

export async function handleGetJob(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const jobs = await getJobs(req.userId!);
    res.status(200).json(jobs);
  } catch (error) {
    next(error);
  }
}

export async function handleJobStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { id } = req.params;

  const validation = updateStatusSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ messgae: 'Invalid status value' });
    return;
  }

  try {
    const job = await updateJobStatus(req.userId!, id as string, validation.data.status);
    res.status(200).json({ message: 'Status updated', job });
  } catch (error) {
    next(error);
  }
}
