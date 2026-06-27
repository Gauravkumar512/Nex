import type { JobStatus } from '../../api/jobs'
import { useUpdateStatus } from '../../hooks/useJobs'
import { useToast } from './Toast'

const ALL: JobStatus[] = ['SAVED', 'APPLIED', 'REPLIED', 'INTERVIEWING', 'REJECTED', 'OFFER']

const STYLES: Record<JobStatus, string> = {
  SAVED:        'bg-surface-warm text-text-secondary',
  APPLIED:      'bg-info-light text-info',
  REPLIED:      'bg-warning-light text-warning',
  INTERVIEWING: 'bg-accent-light text-accent',
  REJECTED:     'bg-danger-light text-danger',
  OFFER:        'bg-success-light text-success',
}

function label(s: JobStatus) {
  return s.charAt(0) + s.slice(1).toLowerCase()
}

interface Props {
  jobId: string
  status: JobStatus
}

export default function StatusDropdown({ jobId, status }: Props) {
  const { mutate, isPending } = useUpdateStatus(jobId)
  const { showToast } = useToast()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    mutate(e.target.value as JobStatus, {
      onSuccess: () => showToast('Status updated', 'success'),
      onError:   () => showToast('Failed to update status', 'error'),
    })
  }

  return (
    <div className="relative inline-block">
      <select
        value={status}
        onChange={handleChange}
        disabled={isPending}
        className={`appearance-none cursor-pointer rounded-full pl-3 pr-7 py-1.5 text-xs font-sans font-medium
          focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed ${STYLES[status]}`}
      >
        {ALL.map((s) => (
          <option key={s} value={s}>{label(s)}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-60">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </div>
  )
}
