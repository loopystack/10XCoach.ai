import { Navigate } from 'react-router-dom'
import { isAuthenticated } from '../utils/api'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin) {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (!userStr) {
      return <Navigate to="/login" replace />
    }

    try {
      const user = JSON.parse(userStr)
      const userEmail = (user.email || '').toLowerCase()
      const userRole = (user.role || 'USER').toUpperCase()
      
      // Check if user is Daniel Rosario or has admin role (SUPER_ADMIN, COACH_ADMIN, or ADMIN)
      const isSuperAdmin = userRole === 'SUPER_ADMIN' || userEmail === 'danrosario0604@gmail.com'
      const isCoachAdmin = userRole === 'COACH_ADMIN'
      const isLegacyAdmin = userRole === 'ADMIN'
      
      // If not an admin, redirect to dashboard
      if (!isSuperAdmin && !isCoachAdmin && !isLegacyAdmin) {
        return <Navigate to="/dashboard" replace />
      }
    } catch (error) {
      return <Navigate to="/login" replace />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute

