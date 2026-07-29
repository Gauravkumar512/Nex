import app from './app';
import client from './config/db';
import { emailQueue, emailQueueEvents } from './config/emailQueue';
import redis from './config/redis';
import { worker } from './workers/email.worker';

const PORT = parseInt(process.env.PORT!);

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(() => {
    Promise.all([client.$disconnect(), redis.quit(), emailQueue.close(), emailQueueEvents.close(), worker.close()])
      .catch((err) => console.error('Error during shutdown', err))
      .finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
