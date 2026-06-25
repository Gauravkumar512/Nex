import { Response } from 'express';

const sseClients = new Map<string, Response>();


const pendingResults = new Map<string, object>();

export function registerSSEClient(jobId: string, res: Response): void {
  sseClients.set(jobId, res);

  const pending = pendingResults.get(jobId);
  if (pending) {
    res.write(`data: ${JSON.stringify(pending)}\n\n`);
    pendingResults.delete(jobId);
    closeSSEClient(jobId);
  }
}

export function sendSSEEvent(jobId: string, data: object): void {
  const client = sseClients.get(jobId);
  if (client) {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  } else {
    pendingResults.set(jobId, data);
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
