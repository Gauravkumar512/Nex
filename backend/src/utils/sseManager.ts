import { Response } from 'express';

const sseClients = new Map<string, Response>();

interface PendingEvent {
  eventName: string;
  data: object;
}

const pendingResults = new Map<string, PendingEvent>();

export function registerSSEClient(jobId: string, res: Response): void {
  sseClients.set(jobId, res);

  const pending = pendingResults.get(jobId);
  if (pending) {
    res.write(`event: ${pending.eventName}\ndata: ${JSON.stringify(pending.data)}\n\n`);
    pendingResults.delete(jobId);
    closeSSEClient(jobId);
  }
}

export function sendSSEEvent(jobId: string, eventName: string, data: object): void {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  const client = sseClients.get(jobId);

  if (client) {
    client.write(payload);
  } else {
    pendingResults.set(jobId, { eventName, data });
    setTimeout(() => pendingResults.delete(jobId), 30_000);
  }
}

export function closeSSEClient(jobId: string): void {
  const client = sseClients.get(jobId);
  if (client) {
    client.end();
    sseClients.delete(jobId);
  }
}
