import { Response } from 'express'

// In-memory map: jobId → SSE response object
const sseClients = new Map<string, Response>()

export function registerSSEClient(jobId: string, res: Response): void {
  sseClients.set(jobId, res)
}

export function sendSSEEvent(jobId: string, data: object): void {
  const client = sseClients.get(jobId)
  if (client) {
    client.write(`data: ${JSON.stringify(data)}\n\n`)
  }
}

export function closeSSEClient(jobId: string): void {
  const client = sseClients.get(jobId)
  if (client) {
    client.end()
    sseClients.delete(jobId)
  }
}