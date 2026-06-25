import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

export interface EmailDraft {
  jobId: string;
  userId: string;
}

export const emailQueue = new Queue<EmailDraft>('email-draft', {
  connection: {
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT!),
  },
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
