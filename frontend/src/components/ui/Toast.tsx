import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  visible: boolean
}

interface ToastCtx {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastCtx | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

const ICONS = {
  success: <CheckCircle size={16} className="shrink-0" />,
  error:   <XCircle    size={16} className="shrink-0" />,
  info:    <Info       size={16} className="shrink-0" />,
}

const STYLES: Record<ToastType, string> = {
  success: 'bg-success-light text-success border border-success/20',
  error:   'bg-danger-light  text-danger  border border-danger/20',
  info:    'bg-info-light    text-info    border border-info/20',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)

    setToasts((prev) => [...prev, { id, message, type, visible: false }])

    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: true } : t)))
    }, 10)

    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)))
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 200)
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-md text-sm font-sans font-medium
              transition-all duration-200 pointer-events-auto
              ${STYLES[t.type]}
              ${t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
            `}
          >
            {ICONS[t.type]}
            <span>{t.message}</span>
            <button
              onClick={() =>
                setToasts((prev) => prev.map((x) => (x.id === t.id ? { ...x, visible: false } : x)))
              }
              className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
