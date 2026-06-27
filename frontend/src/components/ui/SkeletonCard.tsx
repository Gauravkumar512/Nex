export default function SkeletonCard() {
  return (
    <div className="bg-surface rounded-2xl border border-border p-5 flex items-center gap-4">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-surface-warm animate-pulse rounded-xl w-40" />
        <div className="h-3 bg-surface-warm animate-pulse rounded-xl w-28" />
        <div className="h-3 bg-surface-warm animate-pulse rounded-xl w-16 mt-1" />
      </div>
      <div className="w-10 h-10 rounded-full bg-surface-warm animate-pulse" />
      <div className="flex flex-col items-end gap-2">
        <div className="h-5 bg-surface-warm animate-pulse rounded-full w-20" />
        <div className="h-7 bg-surface-warm animate-pulse rounded-full w-16" />
      </div>
    </div>
  )
}
