import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, Mail, Clock, Upload, FileSearch, Send } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { API_URL } from '../api/axios'

/* ── mock job pool — 3 picked randomly on mount ─────────────── */

type MockJob = { company: string; role: string; score: number; status: string }

const JOB_POOL: MockJob[] = [
  { company: 'Stripe',    role: 'Software Engineer Intern',  score: 87, status: 'INTERVIEWING' },
  { company: 'Notion',    role: 'Frontend Engineer',         score: 72, status: 'APPLIED'      },
  { company: 'Linear',    role: 'Product Engineer',          score: 45, status: 'SAVED'        },
  { company: 'Vercel',    role: 'Backend Intern',            score: 91, status: 'OFFER'        },
  { company: 'Figma',     role: 'Full Stack Intern',         score: 63, status: 'REPLIED'      },
  { company: 'Loom',      role: 'SWE Intern',                score: 38, status: 'REJECTED'     },
  { company: 'Raycast',   role: 'Infrastructure Engineer',   score: 79, status: 'INTERVIEWING' },
  { company: 'Supabase',  role: 'Developer Advocate Intern', score: 55, status: 'APPLIED'      },
]

const SLOTS = [
  { rotate: '-rotate-3', translate: '-translate-y-4 translate-x-2',  z: 'z-30' },
  { rotate: 'rotate-1',  translate: 'translate-y-0',                  z: 'z-20' },
  { rotate: 'rotate-3',  translate: 'translate-y-5 -translate-x-2',   z: 'z-10' },
]

function pickThree(): MockJob[] {
  const shuffled = [...JOB_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

const STATUS_STYLES: Record<string, string> = {
  SAVED:        'bg-surface-warm text-text-secondary',
  APPLIED:      'bg-info-light text-info',
  REPLIED:      'bg-warning-light text-warning',
  INTERVIEWING: 'bg-accent-light text-accent',
  REJECTED:     'bg-danger-light text-danger',
  OFFER:        'bg-success-light text-success',
}

function scoreStroke(s: number) {
  if (s >= 70) return '#4A7C59'
  if (s >= 40) return '#B07D2A'
  return '#B94040'
}
function scoreColor(s: number) {
  if (s >= 70) return 'text-success'
  if (s >= 40) return 'text-warning'
  return 'text-danger'
}

function MiniRing({ score }: { score: number }) {
  const r = 14, circ = 2 * Math.PI * r, fill = (score / 100) * circ
  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      <svg width="40" height="40" className="-rotate-90 absolute">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#EDE5D8" strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={scoreStroke(score)}
          strokeWidth="3" strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className={`font-display font-bold text-xs z-10 ${scoreColor(score)}`}>{score}</span>
    </div>
  )
}

function MockCard({ job, slot }: { job: MockJob; slot: typeof SLOTS[number] }) {
  return (
    <div className={`absolute bg-surface border border-border rounded-2xl shadow-md p-4 w-64 ${slot.rotate} ${slot.translate} ${slot.z}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-sans font-medium text-sm text-text-primary truncate">{job.company}</p>
          <p className="font-sans text-xs text-text-secondary truncate mt-0.5">{job.role}</p>
        </div>
        <MiniRing score={job.score} />
      </div>
      <div className="mt-3">
        <span className={`inline-block text-xs font-sans font-medium px-2.5 py-0.5 rounded-full ${STATUS_STYLES[job.status] ?? STATUS_STYLES.SAVED}`}>
          {job.status.charAt(0) + job.status.slice(1).toLowerCase()}
        </span>
      </div>
    </div>
  )
}

/* ── feature + step data ─────────────────────────────────────── */

const FEATURES = [
  {
    icon: Target,
    title: 'AI Match Scoring',
    body: 'Paste a job description and instantly see how well your profile fits — matched skills, missing skills, and an AI breakdown of the gap.',
  },
  {
    icon: Mail,
    title: 'Cold Email Drafts',
    body: 'One click generates a tailored cold email using your resume and the job details. Personalised to the role, not a generic template.',
  },
  {
    icon: Clock,
    title: 'Full Application History',
    body: 'Every status change, email draft, and timeline entry tracked automatically. Never lose context on where an application stands.',
  },
]

const STEPS = [
  {
    icon: Upload,
    step: '01',
    title: 'Upload your resume',
    body: 'Drop your PDF and we extract your skills, projects, and summary — the fuel for everything else.',
  },
  {
    icon: FileSearch,
    step: '02',
    title: 'Add a job',
    body: 'Paste the job description. AI scores your match, lists what you have and what you\'re missing.',
  },
  {
    icon: Send,
    step: '03',
    title: 'Draft and send',
    body: 'Generate a cold email in seconds, copy it, and send — without staring at a blank screen.',
  },
]

/* ── page ────────────────────────────────────────────────────── */

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  // Pick 3 random mock jobs once on mount — rotates each page load
  const [visibleJobs] = useState<MockJob[]>(pickThree)

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Header ── */}
      <header className="px-8 py-5 flex items-center justify-between max-w-7xl mx-auto w-full">
        <span className="font-logo font-bold text-xl text-text-primary">
          Nex<span className="text-accent">.</span>
        </span>
        {!isLoading && isAuthenticated && (
          <button
            onClick={() => navigate('/dashboard')}
            className="font-sans text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
          >
            Dashboard →
          </button>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="flex-1 flex items-center px-8 max-w-7xl mx-auto w-full gap-16 py-12">
        {/* Left */}
        <div className="flex-1 max-w-lg">
          <h1 className="font-display font-bold text-5xl text-text-primary leading-tight">
            Track smarter,{' '}
            <br />
            apply{' '}
            <span className="font-display text-accent">better.</span>
          </h1>

          <p className="font-sans text-text-secondary text-lg mt-5 max-w-md leading-relaxed">
            AI match scoring, cold email drafting, and full application history - all in one place.
          </p>

          <div className="mt-8 flex flex-col items-start gap-3">
            {!isLoading && isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-accent hover:bg-accent-hover text-white font-sans font-medium rounded-full px-6 py-2.5 text-sm transition-all duration-150"
              >
                Go to Dashboard →
              </button>
            ) : (
              <>
                <button
                  onClick={() => { window.location.href = `${API_URL}/auth/google` }}
                  disabled={isLoading}
                  className="bg-accent hover:bg-accent-hover text-white font-sans font-medium rounded-full px-6 py-2.5 text-sm transition-all duration-150 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" opacity=".9"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity=".9"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" opacity=".9"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity=".9"/>
                  </svg>
                  Continue with Google →
                </button>
                <span className="text-text-faint text-xs font-sans">Free to start. No credit card.</span>
              </>
            )}
          </div>
        </div>

        {/* Right — rotating mock cards */}
        <div className="hidden lg:flex flex-1 items-center justify-center">
          <div className="relative w-72 h-72">
            {visibleJobs.map((job, i) => (
              <MockCard key={job.company} job={job} slot={SLOTS[i]!} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-surface border-y border-border py-16 px-8">
        <div className="max-w-5xl mx-auto">
          <p className="font-sans text-xs font-medium text-text-faint uppercase tracking-widest text-center mb-10">
            Everything you need to apply with confidence
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-background rounded-2xl border border-border p-6 space-y-3">
                <div className="w-9 h-9 rounded-xl bg-accent-light flex items-center justify-center">
                  <Icon size={18} className="text-accent" strokeWidth={1.75} />
                </div>
                <h3 className="font-display font-bold text-text-primary">{title}</h3>
                <p className="font-sans text-text-secondary text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-16 px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display font-bold text-3xl text-text-primary text-center mb-12">
            From resume to{' '}
            <span className="text-accent">reply</span>
            {' '}in minutes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(({ icon: Icon, step, title, body }) => (
              <div key={step} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-display font-bold text-4xl text-border">{step}</span>
                  <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center">
                    <Icon size={16} className="text-text-secondary" strokeWidth={1.75} />
                  </div>
                </div>
                <div>
                  <h3 className="font-sans font-medium text-text-primary">{title}</h3>
                  <p className="font-sans text-text-secondary text-sm leading-relaxed mt-1">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ── */}
      <section className="bg-surface border-t border-border py-14 px-8">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <h2 className="font-display font-bold text-3xl text-text-primary">
            Ready to apply <span className="text-accent">smarter?</span>
          </h2>
          <p className="font-sans text-text-secondary text-sm">
            Upload your resume once. Let AI do the heavy lifting on every application after that.
          </p>
          {!isLoading && isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-accent hover:bg-accent-hover text-white font-sans font-medium rounded-full px-8 py-3 text-sm transition-all duration-150"
            >
              Go to Dashboard →
            </button>
          ) : (
            <button
              onClick={() => { window.location.href = `${API_URL}/auth/google` }}
              disabled={isLoading}
              className="bg-accent hover:bg-accent-hover text-white font-sans font-medium rounded-full px-8 py-3 text-sm transition-all duration-150 disabled:opacity-60"
            >
              Get started free →
            </button>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-8 py-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="font-logo font-bold text-text-primary">
            Nex<span className="text-accent">.</span>
          </span>
          <p className="font-sans text-text-faint text-xs">
            Built for students and new grads hunting their first role.
          </p>
          <a
            href="https://github.com/Gauravkumar512/Nex"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-faint hover:text-text-primary transition-colors duration-150"
            aria-label="View source on GitHub"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.562 21.8 24 17.302 24 12 24 5.373 18.627 0 12 0z"/>
            </svg>
          </a>
        </div>
      </footer>

    </div>
  )
}
