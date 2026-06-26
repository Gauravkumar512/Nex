import api from './axios'

export type JobSource = 'WELLFOUND' | 'LINKEDIN' | 'INDEED' | 'REFERRAL' | 'COLD' | 'OTHER'
export type JobStatus = 'SAVED' | 'APPLIED' | 'REPLIED' | 'INTERVIEWING' | 'REJECTED' | 'OFFER'

export interface MatchBreakdown {
  matched: string[]
  missing: string[]
  reasoning: string
}

export interface StatusHistory {
  id: string
  status: JobStatus
  changedAt: string   // backend field is changedAt, not createdAt
}

export interface Company {
  id: string
  name: string
  website?: string | null
}

export interface Job {
  id: string
  role: string
  company: Company          // nested relation, not flat companyName
  jobDescription?: string | null
  hrName?: string | null
  hrEmail?: string | null
  source: JobSource
  status: JobStatus
  matchScore?: number | null
  matchBreakdown?: MatchBreakdown | null   
  statusHistory: StatusHistory[]
  createdAt: string
}

export interface CreateJobPayload {
  role: string
  companyName: string
  companyWebsite?: string
  jobDescription?: string
  hrName?: string
  hrEmail?: string
  source: JobSource
}

export interface EmailDraft {
  subject: string
  body: string
}

export const getJobs = () => api.get<Job[]>('/jobs').then((r) => r.data)

export const getJob = (id: string) => api.get<Job>(`/jobs/${id}`).then((r) => r.data)

// Backend returns { message, job } — extract the job
export const createJob = (payload: CreateJobPayload) =>
  api.post<{ message: string; job: Job }>('/jobs', payload).then((r) => r.data.job)

// Backend returns { message, job } — extract the job
export const updateStatus = (id: string, status: JobStatus) =>
  api.patch<{ message: string; job: Job }>(`/jobs/${id}/status`, { status }).then((r) => r.data.job)

export const draftEmail = (id: string) => api.post(`/jobs/${id}/draft-email`)
