// PARITY: este archivo se mantiene en paridad con su gemelo en el otro SPA
// (prisier-admin ↔ prisier-client). Replica los cambios y corre scripts/check-parity.sh.
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { isClienteEditor } from '../lib/permissions'

interface Props {
  allowedRoles?: string[]
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-p-lime" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    const fallback = isClienteEditor(user.rol) ? '/reglas' : '/'
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
