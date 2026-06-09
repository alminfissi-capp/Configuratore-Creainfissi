import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface AdminRouteProps {
  children: React.ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="ci-skeleton" style={{ width: '200px', height: '24px' }} />
      </div>
    )
  }

  if (!session || profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
