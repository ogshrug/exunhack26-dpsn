import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Nav from '../components/Nav'
import GlobeBackdrop from '../components/GlobeBackdrop'

function Shell() {
  return (
    <div className="min-h-full flex flex-col">
      <GlobeBackdrop />
      <Nav />
      <main className="flex-1 px-4 md:px-8 py-10 max-w-7xl w-full mx-auto"><Outlet /></main>
      <footer className="border-t border-line">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-wrap justify-between gap-2 text-xs text-haze">
          <span>© 2026 THURIBLES. The second coming, operationalised.</span>
          <span className="label label-crimson flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-crimson" />Cluster health: 100%</span>
        </div>
      </footer>
    </div>
  )
}

export function RequireAuth() {
  const { session, profile, loading } = useAuth()
  if (loading) return <div className="p-8 label label-crimson">authenticating…</div>
  if (!session || !profile) return <Navigate to="/login" replace />
  return <Shell />
}

export function RequireAdmin() {
  const { profile } = useAuth()
  if (profile?.role !== 'admin') return <Navigate to="/home" replace />
  return <Outlet />
}
