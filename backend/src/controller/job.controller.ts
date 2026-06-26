import { JobStatus } from '@prisma/client';
import { NextFunction, Response } from 'express';
import { z } from 'zod';
import client from '../config/db';
import { emailQueue } from '../config/emailQueue';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createJobSchema } from '../schemas/job.schema';
import { createJob, getJobs, updateJobStatus } from '../services/job.service';
import { closeSSEClient, registerSSEClient } from '../utils/sseManager';

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

export async function handleGetSingleJob(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const id = req.params.id as string;
  try {
    const job = await client.job.findUnique({
      where: { id },
      include: {
        company: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });

    if (!job || job.userId !== req.userId) {
      res.status(404).json({ message: 'Job not found' });
      return;
    }

    res.status(200).json(job);
  } catch (error) {
    next(error);
  }
}

export async function handleJobStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { id } = req.params;

  const validation = updateStatusSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ message: 'Invalid status value', errors: validation.error.issues });
    return;
  }

  try {
    const job = await updateJobStatus(req.userId!, id as string, validation.data.status);
    res.status(200).json({ message: 'Status updated', job });
  } catch (error) {
    next(error);
  }
}

export async function handleEmail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const id = req.params.id as string;

  try {
    const job = await client.job.findUnique({ where: { id } });

    if (!job || job.userId !== req.userId) {
      res.status(404).json({ message: 'Job not found' });
      return;
    }

    await emailQueue.add('draft', {
      jobId: id,
      userId: req.userId!,
    });

    res.status(202).json({ message: 'Email drafting started', streamUrl: `/jobs/${id}/email-stream` });
  } catch (error) {
    next(error);
  }
}

export async function handleEmailStream(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const id = req.params.id as string;

  try {
    const job = await client.job.findUnique({ where: { id } });
    if (!job || job.userId !== req.userId) {
      res.status(404).json({ message: 'Job not found' });
      return;
    }
  } catch (err) {
    next(err);
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  registerSSEClient(id as string, res);

  req.on('close', () => closeSSEClient(id as string));
}
