import { Navigate } from 'react-router-dom'
import { getAdvisorSession } from '../auth'

export default function RequireAdvisorAuth({ children }) {
  const session = getAdvisorSession()
  if (!session) return <Navigate to="/login" replace />
  return children
}
