import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, User, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs/new',  label: 'Add Job',   icon: PlusCircle },
  { to: '/profile',   label: 'Profile',   icon: User },
]

export default function Sidebar() {
  const { user } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    window.location.href = 'http://localhost:3000/auth/logout'
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-surface border-r border-border flex flex-col z-40">
      <div className="px-6 pt-6 pb-4">
        <span
          className="font-logo font-bold text-2xl text-text-primary cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          Nex<span className="text-accent">.</span>
        </span>
      </div>

      {/* User */}
      {user && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 bg-surface-warm rounded-xl p-3">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                <span className="text-accent text-xs font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
              <p className="text-xs text-text-faint truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mb-2">
        <div className="h-px bg-border" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans font-medium transition-all duration-150',
                isActive
                  ? 'bg-accent-light text-accent border-l-2 border-accent pl-[10px]'
                  : 'text-text-secondary hover:bg-surface-warm',
              ].join(' ')
            }
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 pb-6 space-y-3">
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <span className="bg-accent-light text-accent rounded-full px-3 py-1 text-xs font-sans font-medium">
            5 drafts left
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-text-faint hover:text-danger transition-colors duration-150 font-sans"
          >
            <LogOut size={14} strokeWidth={2} />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
