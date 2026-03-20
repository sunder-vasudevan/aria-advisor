import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ClientList from './pages/ClientList'
import Client360 from './pages/Client360'
import ClientForm from './pages/ClientForm'
import AdvisorLogin from './pages/AdvisorLogin'
import ClientLogin from './pages/ClientLogin'
import ClientPortal from './pages/ClientPortal'
import HelpPage from './pages/HelpPage'
import RequireAdvisorAuth from './components/RequireAdvisorAuth'
import RequireClientAuth from './components/RequireClientAuth'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AdvisorLogin />} />
        <Route path="/client-portal/login" element={<ClientLogin />} />
        <Route path="/client-portal" element={
          <RequireClientAuth><ClientPortal /></RequireClientAuth>
        } />
        <Route path="/" element={
          <RequireAdvisorAuth><ClientList /></RequireAdvisorAuth>
        } />
        <Route path="/clients/new" element={
          <RequireAdvisorAuth><ClientForm /></RequireAdvisorAuth>
        } />
        <Route path="/clients/:id" element={
          <RequireAdvisorAuth><Client360 /></RequireAdvisorAuth>
        } />
        <Route path="/clients/:id/edit" element={
          <RequireAdvisorAuth><ClientForm /></RequireAdvisorAuth>
        } />
        <Route path="/help" element={
          <RequireAdvisorAuth><HelpPage /></RequireAdvisorAuth>
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
