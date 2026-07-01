import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import Button from '../components/ui/Button'
import { useCreateJob } from '../hooks/useJobs'
import type { JobSource } from '../api/jobs'

const INPUT =
  'bg-white border border-border rounded-xl px-4 py-3 text-sm text-text-primary ' +
  'placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-accent/30 ' +
  'focus:border-border-strong w-full transition-all duration-150'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block font-sans text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function AnimatedDots() {
  return (
    <span className="inline-flex gap-0.5 items-end ml-1">
      <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:0ms]" />
      <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:150ms]" />
      <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:300ms]" />
    </span>
  )
}

const SOURCES: { value: JobSource; label: string }[] = [
  { value: 'WELLFOUND', label: 'Wellfound' },
  { value: 'LINKEDIN',  label: 'LinkedIn' },
  { value: 'INDEED',    label: 'Indeed' },
  { value: 'REFERRAL',  label: 'Referral' },
  { value: 'COLD',      label: 'Cold Outreach' },
  { value: 'OTHER',     label: 'Other' },
]

export default function AddJob() {
  const navigate = useNavigate()
  const { mutateAsync, isPending } = useCreateJob()

  const [form, setForm] = useState({
    role: '',
    companyName: '',
    companyWebsite: '',
    jobDescription: '',
    hrName: '',
    hrEmail: '',
    source: 'LINKEDIN' as JobSource,
  })
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const job = await mutateAsync({
        role: form.role,
        companyName: form.companyName,
        companyWebsite: form.companyWebsite || undefined,
        jobDescription: form.jobDescription || undefined,
        hrName: form.hrName || undefined,
        hrEmail: form.hrEmail || undefined,
        source: form.source,
      })
      navigate(`/jobs/${job.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display font-bold text-2xl text-text-primary">Add a Job</h1>
          <p className="font-sans text-text-secondary text-sm mt-1">
            Paste the job description for the best AI match score.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Role" required>
              <input
                className={INPUT}
                placeholder="Software Engineer Intern"
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                required
                disabled={isPending}
              />
            </Field>
            <Field label="Company Name" required>
              <input
                className={INPUT}
                placeholder="Stripe"
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                required
                disabled={isPending}
              />
            </Field>
          </div>

          <Field label="Company Website">
            <input
              className={INPUT}
              placeholder="https://stripe.com"
              type="url"
              value={form.companyWebsite}
              onChange={(e) => set('companyWebsite', e.target.value)}
              disabled={isPending}
            />
          </Field>

          <Field label="Job Description">
            <textarea
              className={`${INPUT} resize-none min-h-48`}
              placeholder="Paste the full job description here — used for AI match scoring…"
              value={form.jobDescription}
              onChange={(e) => set('jobDescription', e.target.value)}
              disabled={isPending}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="HR Name">
              <input
                className={INPUT}
                placeholder="Jane Smith"
                value={form.hrName}
                onChange={(e) => set('hrName', e.target.value)}
                disabled={isPending}
              />
            </Field>
            <Field label="HR Email">
              <input
                className={INPUT}
                placeholder="jane@stripe.com"
                type="email"
                value={form.hrEmail}
                onChange={(e) => set('hrEmail', e.target.value)}
                disabled={isPending}
              />
            </Field>
          </div>

          <Field label="Source">
            <div className="relative">
              <select
                className={`${INPUT} appearance-none cursor-pointer pr-10`}
                value={form.source}
                onChange={(e) => set('source', e.target.value as JobSource)}
                disabled={isPending}
              >
                {SOURCES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {/* Chevron */}
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-faint">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
          </Field>

          {error && (
            <p className="font-sans text-danger text-sm">{error}</p>
          )}

          <Button type="submit" fullWidth disabled={isPending}>
            {isPending ? (
              <span className="flex items-center justify-center">
                Scoring with AI<AnimatedDots />
              </span>
            ) : (
              'Add & Score →'
            )}
          </Button>
        </form>
      </div>
    </AppLayout>
  )
}
