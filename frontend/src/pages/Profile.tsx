import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, UploadCloud, ExternalLink } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Button from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { uploadResume, getProfile } from '../api/profile'
import type { Profile } from '../api/profile'

function ProfileSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-surface-warm rounded-xl" />
        <div className="h-4 w-64 bg-surface-warm rounded-xl" />
      </div>
      <div className="h-20 bg-surface-warm rounded-xl" />
      <div className="space-y-3">
        <div className="h-4 w-20 bg-surface-warm rounded-xl" />
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-6 w-16 bg-surface-warm rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-32 bg-surface-warm rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

function AnimatedDots() {
  return (
    <span className="inline-flex gap-0.5 items-end ml-1">
      <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce [animation-delay:300ms]" />
    </span>
  )
}

function UploadZone({ onUpload }: { onUpload: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState('')

  function validate(file: File): boolean {
    if (file.type !== 'application/pdf') {
      setFileError('Only PDF files are supported.')
      return false
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File too large. Max 5MB.')
      return false
    }
    setFileError('')
    return true
  }

  function handleFile(file: File) {
    if (validate(file)) onUpload(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150
          ${isDragging
            ? 'border-accent bg-accent-light'
            : 'border-border hover:border-border-strong hover:bg-surface-warm'
          }`}
      >
        <UploadCloud
          size={40}
          className={isDragging ? 'text-accent' : 'text-text-faint'}
          strokeWidth={1.5}
        />
        <p className="font-sans font-medium text-text-primary mt-4 text-sm">
          Drop your resume PDF here or click to upload
        </p>
        <p className="font-sans text-text-faint text-xs mt-1">PDF only · Max 5MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleChange}
        />
      </div>
      {fileError && <p className="font-sans text-danger text-xs">{fileError}</p>}
    </div>
  )
}

function SkillGroup({ title, skills }: { title: string; skills: string[] }) {
  if (skills.length === 0) return null
  return (
    <div>
      <p className="font-sans text-xs font-medium text-text-faint uppercase tracking-wider mb-2">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {skills.map((s) => (
          <span
            key={s}
            className="bg-surface-warm text-text-primary text-xs font-sans font-medium px-3 py-1 rounded-full"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

function ProfileDisplay({
  profile,
  onReupload,
}: {
  profile: Profile
  onReupload: () => void
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">Your Profile</h1>
          <p className="font-sans text-text-secondary text-sm mt-1">
            Extracted from your resume. Used for AI match scoring and email drafts.
          </p>
        </div>
        <Button variant="secondary" onClick={onReupload}>
          Re-upload Resume
        </Button>
      </div>

      {/* Summary */}
      {profile.summary && (
        <div className="border-l-4 border-accent bg-accent-light rounded-r-xl p-4">
          <p className="font-sans italic text-text-secondary leading-relaxed text-sm">
            {profile.summary}
          </p>
        </div>
      )}

      {/* Skills */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-5">
        <h2 className="font-display font-bold text-lg text-text-primary">Skills</h2>
        <SkillGroup title="Languages"  skills={profile.skills.languages} />
        <SkillGroup title="Frameworks" skills={profile.skills.frameworks} />
        <SkillGroup title="Tools"      skills={profile.skills.tools} />
      </div>

      {/* Projects */}
      {profile.projects.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display font-bold text-lg text-text-primary">Projects</h2>
          <div className="grid grid-cols-1 gap-4">
            {profile.projects.map((p) => (
              <div key={p.name} className="bg-surface rounded-2xl border border-border p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display font-bold text-text-primary">{p.name}</h3>
                  {p.githubUrl && (
                    <a
                      href={p.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-sans text-accent hover:underline text-sm shrink-0"
                    >
                      <ExternalLink size={13} />
                      GitHub
                    </a>
                  )}
                </div>

                {p.description && (
                  <p className="font-sans text-text-secondary text-sm leading-relaxed">
                    {p.description}
                  </p>
                )}

                {p.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.techStack.map((t) => (
                      <span
                        key={t}
                        className="bg-surface-warm text-text-faint text-xs font-sans px-2.5 py-0.5 rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Profile() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [forceUpload, setForceUpload] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    retry: false,
  })

  const { mutateAsync, isPending: isUploading } = useMutation({
    mutationFn: uploadResume,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      setForceUpload(false)
    },
    onError: () => showToast('Upload failed. Please try again.', 'error'),
  })

  async function handleUpload(file: File) {
    await mutateAsync(file)
  }

  if (isLoading) {
    return (
      <AppLayout>
        <ProfileSkeleton />
      </AppLayout>
    )
  }

  const showProfile = !!profile && !forceUpload

  return (
    <AppLayout>
      {showProfile ? (
        <ProfileDisplay profile={profile} onReupload={() => setForceUpload(true)} />
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-text-primary">
              {forceUpload ? 'Re-upload Resume' : 'Upload Your Resume'}
            </h1>
            <p className="font-sans text-text-secondary text-sm mt-1">
              We'll extract your skills and projects to power AI match scoring.
            </p>
          </div>

          {isUploading ? (
            <div className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-4">
              <FileText size={40} className="text-text-faint" strokeWidth={1.5} />
              <p className="font-sans text-text-secondary text-sm flex items-center">
                Extracting your profile with AI<AnimatedDots />
              </p>
              <p className="font-sans text-text-faint text-xs">This can take 10–20 seconds</p>
            </div>
          ) : (
            <UploadZone onUpload={handleUpload} />
          )}

          {forceUpload && !isUploading && (
            <div className="flex justify-end">
              <button
                onClick={() => setForceUpload(false)}
                className="font-sans text-sm text-text-faint hover:text-text-primary transition-colors duration-150"
              >
                ← Back to profile
              </button>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}
