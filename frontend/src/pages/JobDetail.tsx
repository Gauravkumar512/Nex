import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, RotateCcw } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import MatchScoreRing from '../components/ui/MatchScoreRing'
import Badge from '../components/ui/Badge'
import StatusDropdown from '../components/ui/StatusDropdown'
import Button from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { useJob } from '../hooks/useJobs'
import { draftEmail } from '../api/jobs'
import type { JobStatus } from '../api/jobs'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function PageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-pulse">
      <div className="h-4 w-28 bg-surface-warm rounded-xl" />
      <div className="space-y-2">
        <div className="h-8 w-56 bg-surface-warm rounded-xl" />
        <div className="h-5 w-40 bg-surface-warm rounded-xl" />
      </div>
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-surface-warm" />
          <div className="space-y-2">
            <div className="h-10 w-24 bg-surface-warm rounded-xl" />
            <div className="h-4 w-36 bg-surface-warm rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-surface-warm rounded-xl" />
          <div className="h-20 bg-surface-warm rounded-xl" />
        </div>
        <div className="h-16 bg-surface-warm rounded-xl" />
      </div>
    </div>
  )
}

function EmailSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-2/3 bg-surface-warm rounded-xl" />
      <div className="h-4 w-1/3 bg-surface-warm rounded-xl" />
      <div className="h-28 bg-surface-warm rounded-xl mt-2" />
      <div className="h-4 w-1/2 bg-surface-warm rounded-xl" />
      <div className="h-4 w-3/4 bg-surface-warm rounded-xl" />
    </div>
  )
}

type DraftState = 'idle' | 'loading' | 'done' | 'error'
type DraftPayload = { subject: string; body: string }

function storageKey(jobId: string) {
  return `nex_draft_${jobId}`
}

function loadDraft(jobId: string): DraftPayload | null {
  try {
    const raw = localStorage.getItem(storageKey(jobId))
    return raw ? (JSON.parse(raw) as DraftPayload) : null
  } catch {
    return null
  }
}

function saveDraft(jobId: string, draft: DraftPayload) {
  try {
    localStorage.setItem(storageKey(jobId), JSON.stringify(draft))
  } catch { /* ignore quota errors */ }
}

function clearDraft(jobId: string) {
  localStorage.removeItem(storageKey(jobId))
}

function EmailSection({ jobId }: { jobId: string }) {
  const { showToast } = useToast()
  const sourceRef = useRef<EventSource | null>(null)

  const saved = loadDraft(jobId)
  const [draftState, setDraftState] = useState<DraftState>(saved ? 'done' : 'idle')
  const [draft, setDraft] = useState<DraftPayload | null>(saved)

  useEffect(() => () => { sourceRef.current?.close() }, [])

  async function handleDraft() {
    setDraftState('loading')
    setDraft(null)

    const source = new EventSource(
      `http://localhost:3000/jobs/${jobId}/email-stream`,
      { withCredentials: true }
    )
    sourceRef.current = source

    source.addEventListener('done', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { draft: DraftPayload }
      saveDraft(jobId, data.draft)   // persist before setting state
      setDraft(data.draft)
      setDraftState('done')
      source.close()
    })

    source.addEventListener('pending', () => { /* keep skeleton */ })

    source.addEventListener('error', () => {
      setDraftState((prev) => (prev === 'done' ? 'done' : 'error'))
      source.close()
    })

    try {
      await draftEmail(jobId)
    } catch {
      setDraftState('error')
      source.close()
    }
  }

  function handleRedraft() {
    clearDraft(jobId)
    setDraftState('idle')
    setDraft(null)
  }

  async function copy(text: string, label = 'Copied to clipboard') {
    await navigator.clipboard.writeText(text)
    showToast(label, 'success')
  }

  if (draftState === 'idle') {
    return (
      <div className="space-y-2">
        <Button onClick={handleDraft}>Draft Cold Email</Button>
        <p className="font-sans text-text-faint text-xs">
          Takes 10–15 seconds. Drafts are generated using your profile and this job's details.
        </p>
      </div>
    )
  }

  if (draftState === 'loading') {
    return <EmailSkeleton />
  }

  if (draftState === 'error') {
    return (
      <div className="space-y-3">
        <p className="font-sans text-danger text-sm">Drafting failed — try again</p>
        <Button onClick={handleDraft}>Retry</Button>
      </div>
    )
  }

  if (draftState === 'done' && draft) {
    return (
      <div className="space-y-4">
        {/* Subject */}
        <div className="flex items-center justify-between gap-3">
          <p className="font-sans font-medium text-text-primary text-sm truncate">
            {draft.subject}
          </p>
          <button
            onClick={() => copy(draft.subject, 'Subject copied')}
            className="shrink-0 flex items-center gap-1 text-xs font-sans text-text-faint hover:text-text-primary transition-colors duration-150"
          >
            <Copy size={12} />
            Copy
          </button>
        </div>

        {/* Body */}
        <div className="bg-surface-warm rounded-xl p-4">
          <p className="font-sans text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
            {draft.body}
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => copy(`Subject: ${draft.subject}\n\n${draft.body}`, 'Email copied')}
        >
          <Copy size={14} className="mr-2" />
          Copy Full Email
        </Button>

        <button
          onClick={handleRedraft}
          className="block font-sans text-xs text-text-faint hover:text-text-primary transition-colors duration-150"
        >
          Re-draft
        </button>
      </div>
    )
  }

  return null
}

function HistoryTimeline({ history }: { history: { id: string; status: JobStatus; changedAt: string }[] }) {
  return (
    <div className="relative ml-3 border-l-2 border-border pl-6 space-y-5">
      {history.map((entry) => (
        <div key={entry.id} className="relative">
          <span className="absolute -left-7.75 top-1 w-3 h-3 rounded-full bg-surface border-2 border-border-strong" />
          <div className="flex items-center gap-3">
            <Badge status={entry.status} />
            <span className="font-sans text-text-faint text-xs">{formatDate(entry.changedAt)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: job, isLoading } = useJob(id!)

  if (isLoading) {
    return (
      <AppLayout>
        <PageSkeleton />
      </AppLayout>
    )
  }

  if (!job) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto text-center py-20">
          <p className="font-sans text-text-secondary">Job not found.</p>
          <button onClick={() => navigate('/dashboard')} className="mt-4 font-sans text-sm text-accent hover:underline">
            ← Back to Dashboard
          </button>
        </div>
      </AppLayout>
    )
  }

  const skillMatch = job.matchBreakdown

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 font-sans text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
        >
          <ArrowLeft size={14} />
          Dashboard
        </button>

        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-2xl text-text-primary">{job.company.name}</h1>
              <p className="font-sans text-text-secondary text-lg mt-0.5">{job.role}</p>
            </div>
            <StatusDropdown jobId={job.id} status={job.status} />
          </div>

          <div className="bg-surface rounded-2xl border border-border p-6 space-y-5">
            <div className="flex items-center gap-5">
              <MatchScoreRing score={job.matchScore ?? undefined} size={80} />
              <div>
                <p className="font-display font-bold text-6xl text-text-primary leading-none">
                  {job.matchScore ?? '—'}
                </p>
                <p className="font-sans text-text-faint text-sm mt-1">match score</p>
              </div>
            </div>

            {skillMatch && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {/* Matched */}
                  <div>
                    <p className="font-sans text-xs font-medium text-success mb-2">Matched</p>
                    <div className="flex flex-wrap gap-1.5">
                      {skillMatch.matched.map((s) => (
                        <span key={s} className="bg-success-light text-success text-xs font-sans font-medium px-3 py-1 rounded-full">
                          {s}
                        </span>
                      ))}
                      {skillMatch.matched.length === 0 && (
                        <span className="font-sans text-xs text-text-faint">None</span>
                      )}
                    </div>
                  </div>

                  {/* Missing */}
                  <div>
                    <p className="font-sans text-xs font-medium text-danger mb-2">Missing</p>
                    <div className="flex flex-wrap gap-1.5">
                      {skillMatch.missing.map((s) => (
                        <span key={s} className="bg-danger-light text-danger text-xs font-sans font-medium px-3 py-1 rounded-full">
                          {s}
                        </span>
                      ))}
                      {skillMatch.missing.length === 0 && (
                        <span className="font-sans text-xs text-text-faint">None</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reasoning */}
                <div className="bg-surface-warm rounded-xl p-4">
                  <p className="font-sans text-text-secondary text-sm italic leading-relaxed">
                    {skillMatch.reasoning}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-xl text-text-primary">Cold Email Draft</h2>
            {job.hrName && (
              <span className="font-sans text-xs text-text-faint">
                To: {job.hrName}{job.hrEmail ? ` <${job.hrEmail}>` : ''}
              </span>
            )}
          </div>
          <EmailSection jobId={job.id} />
        </div>

        {job.statusHistory?.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <RotateCcw size={14} className="text-text-faint" />
              <h2 className="font-display font-bold text-lg text-text-primary">History</h2>
            </div>
            <HistoryTimeline history={job.statusHistory} />
          </div>
        )}

      </div>
    </AppLayout>
  )
}
