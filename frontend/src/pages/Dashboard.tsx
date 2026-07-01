import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import MatchScoreRing from '../components/ui/MatchScoreRing'
import Badge from '../components/ui/Badge'
import SkeletonCard from '../components/ui/SkeletonCard'
import { useJobs } from '../hooks/useJobs'
import type { Job } from '../api/jobs'

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-4">
      <p className="font-display font-bold text-3xl text-text-primary">{value}</p>
      <p className="font-sans text-text-faint text-xs mt-1">{label}</p>
    </div>
  )
}

function StatSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-border p-4 space-y-2">
      <div className="h-8 w-12 bg-surface-warm animate-pulse rounded-xl" />
      <div className="h-3 w-20 bg-surface-warm animate-pulse rounded-xl" />
    </div>
  )
}

function JobRow({ job }: { job: Job }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/jobs/${job.id}`)}
      className="bg-surface rounded-2xl border border-border p-5 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-border-strong transition-all duration-150 group"
    >
      {/* Left */}
      <div className="flex-1 min-w-0">
        <p className="font-sans font-medium text-text-primary truncate">{job.company.name}</p>
        <p className="font-sans text-sm text-text-secondary truncate mt-0.5">{job.role}</p>
        <span className="inline-block mt-1.5 text-xs font-sans text-text-faint bg-surface-warm px-2 py-0.5 rounded-full">
          {job.source.charAt(0) + job.source.slice(1).toLowerCase()}
        </span>
      </div>

      {/* Center — score */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <MatchScoreRing score={job.matchScore ?? undefined} size={44} />
        <span className="font-sans text-xs text-text-faint">match</span>
      </div>

      {/* Right */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <Badge status={job.status} />
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`) }}
          className="bg-surface-warm hover:bg-surface-deep text-text-primary font-sans font-medium rounded-full px-4 py-1.5 text-xs border border-border transition-all duration-150"
        >
          View →
        </button>
      </div>
    </div>
  )
}

function EmptyState() {
  const navigate = useNavigate()
  return (
    <div className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-4">
      <p className="font-sans text-text-secondary text-sm max-w-xs">
        No applications yet. Add your first job to get started.
      </p>
      <button
        onClick={() => navigate('/jobs/new')}
        className="bg-accent hover:bg-accent-hover text-white font-sans font-medium rounded-full px-6 py-2.5 text-sm transition-all duration-150"
      >
        Add Job →
      </button>
    </div>
  )
}

export default function Dashboard() {
  const { data: jobs, isLoading } = useJobs()

  const total       = jobs?.length ?? 0
  const applied     = jobs?.filter((j) => j.status === 'APPLIED').length ?? 0
  const interviewing = jobs?.filter((j) => j.status === 'INTERVIEWING').length ?? 0
  const avgScore    = jobs?.length
    ? Math.round(
        jobs.reduce((sum, j) => sum + (j.matchScore ?? 0), 0) / jobs.length
      )
    : 0

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Heading */}
        <div>
          <h1 className="font-display font-bold text-3xl text-text-primary">
            Your <em className="italic text-accent">Applications</em>
          </h1>
          <p className="font-sans text-text-secondary text-sm mt-1">
            Track every application, score, and conversation in one place.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          ) : (
            <>
              <StatCard value={total}       label="Total Jobs" />
              <StatCard value={applied}     label="Applied" />
              <StatCard value={interviewing} label="Interviewing" />
              <StatCard value={`${avgScore}%`} label="Avg Match Score" />
            </>
          )}
        </div>

        {/* Jobs list */}
        <div className="space-y-3">
          <h2 className="font-sans font-medium text-text-primary text-sm">All Applications</h2>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : !jobs || jobs.length === 0 ? (
            <EmptyState />
          ) : (
            jobs.map((job) => <JobRow key={job.id} job={job} />)
          )}
        </div>
      </div>
    </AppLayout>
  )
}
