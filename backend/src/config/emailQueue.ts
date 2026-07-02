import { Queue, QueueEvents } from 'bullmq';
import { closeSSEClient, sendSSEEvent } from '../utils/sseManager';

export interface EmailDraft {
  jobId: string;
  userId: string;
}

const connection = {
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT!),
};

export const emailQueue = new Queue<EmailDraft>('email-draft', {
  connection,
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

// The worker that processes these jobs runs in a separate process, so it can't
// write directly into this process's in-memory SSE client map. QueueEvents
// listens over Redis and bridges completion back to whichever process holds
// the open SSE connection for this job id.
const emailQueueEvents = new QueueEvents('email-draft', { connection });

emailQueueEvents.on('completed', ({ jobId, returnvalue }) => {
  sendSSEEvent(jobId, 'done', { draft: returnvalue as unknown as { subject: string; body: string } });
  closeSSEClient(jobId);
});

emailQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Email draft job failed for ${jobId}:`, failedReason);
  sendSSEEvent(jobId, 'error', { message: 'Failed to draft email. Please try again.' });
  closeSSEClient(jobId);
});
