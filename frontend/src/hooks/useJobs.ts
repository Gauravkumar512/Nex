import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getJobs,
  getJob,
  createJob,
  updateStatus,
  type CreateJobPayload,
  type JobStatus,
} from '../api/jobs'

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: getJobs,
    staleTime: 2 * 60 * 1000,
  })
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: () => getJob(id),
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateJobPayload) => createJob(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })
}

export function useUpdateStatus(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: JobStatus) => updateStatus(jobId, status),
    onMutate: async (status) => {
      await qc.cancelQueries({ queryKey: ['jobs', jobId] })
      const prev = qc.getQueryData(['jobs', jobId])
      qc.setQueryData(['jobs', jobId], (old: ReturnType<typeof qc.getQueryData>) => {
        if (!old) return old
        return { ...(old as object), status }
      })
      return { prev }
    },
    onError: (_err, _status, ctx) => {
      if (ctx?.prev) qc.setQueryData(['jobs', jobId], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['jobs', jobId] })
      qc.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}
