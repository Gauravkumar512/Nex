import type { JobStatus } from '../../api/jobs'

const STATUS_MAP: Record<JobStatus, { bg: string; text: string; label: string }> = {
  SAVED:        { bg: 'bg-surface-warm',    text: 'text-text-secondary', label: 'Saved' },
  APPLIED:      { bg: 'bg-info-light',      text: 'text-info',           label: 'Applied' },
  REPLIED:      { bg: 'bg-warning-light',   text: 'text-warning',        label: 'Replied' },
  INTERVIEWING: { bg: 'bg-accent-light',    text: 'text-accent',         label: 'Interviewing' },
  REJECTED:     { bg: 'bg-danger-light',    text: 'text-danger',         label: 'Rejected' },
  OFFER:        { bg: 'bg-success-light',   text: 'text-success',        label: 'Offer' },
}

interface Props {
  status: JobStatus
  className?: string
}

export default function Badge({ status, className = '' }: Props) {
  const { bg, text, label } = STATUS_MAP[status]
  return (
    <span
      className={`inline-block text-xs font-sans font-medium px-2.5 py-0.5 rounded-full ${bg} ${text} ${className}`}
    >
      {label}
    </span>
  )
}
