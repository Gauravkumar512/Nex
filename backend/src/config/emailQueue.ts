import { Queue, QueueEvents } from 'bullmq';
import { redisConnection } from './redis';
import { closeSSEClient, sendSSEEvent } from '../utils/sseManager';

export interface EmailDraft {
  jobId: string;
  userId: string;
}

export const emailQueue = new Queue<EmailDraft>('email-draft', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: true,
  },
});

export const emailQueueEvents = new QueueEvents('email-draft', { connection: redisConnection });

emailQueueEvents.on('completed', ({ jobId, returnvalue }) => {
  sendSSEEvent(jobId, 'done', { draft: returnvalue as unknown as { subject: string; body: string } });
  closeSSEClient(jobId);
});

emailQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Email draft job failed for ${jobId}:`, failedReason);
  sendSSEEvent(jobId, 'error', { message: 'Failed to draft email. Please try again.' });
  closeSSEClient(jobId);
});
