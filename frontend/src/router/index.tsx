import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Landing from '../pages/Landing'
import Dashboard from '../pages/Dashboard'
import AddJob from '../pages/AddJob'
import JobDetail from '../pages/JobDetail'
import Profile from '../pages/Profile'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-80">
          <div className="h-8 bg-surface-warm animate-pulse rounded-xl" />
          <div className="h-4 bg-surface-warm animate-pulse rounded-xl w-3/4" />
          <div className="h-4 bg-surface-warm animate-pulse rounded-xl w-1/2" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/" replace />

  return <>{children}</>
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/new"
          element={
            <ProtectedRoute>
              <AddJob />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/:id"
          element={
            <ProtectedRoute>
              <JobDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
