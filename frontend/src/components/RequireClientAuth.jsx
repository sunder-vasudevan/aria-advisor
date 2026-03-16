import { Navigate } from 'react-router-dom'
import { getClientSession } from '../auth'

export default function RequireClientAuth({ children }) {
  const session = getClientSession()
  if (!session) return <Navigate to="/client-portal/login" replace />
  return children
}
