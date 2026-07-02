interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  fullWidth?: boolean
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  children,
  ...rest
}: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 font-sans font-medium rounded-full px-6 py-2.5 text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed'

  const styles = {
    primary:   'bg-accent hover:bg-accent-hover text-white',
    secondary: 'bg-surface-warm hover:bg-surface-deep text-text-primary border border-border',
  }

  return (
    <button
      className={`${base} ${styles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
