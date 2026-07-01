import Sidebar from './Sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen px-8 py-6 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
