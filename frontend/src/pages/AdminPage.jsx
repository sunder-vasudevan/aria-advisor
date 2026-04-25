import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdvisorSession } from '../auth'
import { fmt } from '../api/client'
import { Users, ShieldCheck, TrendingUp, AlertTriangle, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'

const BASE = import.meta.env.VITE_API_URL || '/api'

async function fetchAdvisors() {
  const session = JSON.parse(localStorage.getItem('aria_advisor_session') || '{}')
  const res = await fetch(`${BASE}/admin/advisors`, {
    headers: {
      'X-Advisor-Id': String(session.id || ''),
      'X-Advisor-Role': session.role || '',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function toggleAdvisor(id, activate) {
  const session = JSON.parse(localStorage.getItem('aria_advisor_session') || '{}')
  const action = activate ? 'activate' : 'deactivate'
  const res = await fetch(`${BASE}/admin/advisors/${id}/${action}`, {
    method: 'PATCH',
    headers: {
      'X-Advisor-Id': String(session.id || ''),
      'X-Advisor-Role': session.role || '',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export default function AdminPage() {
  const navigate = useNavigate()
  const session = getAdvisorSession()
  const [advisors, setAdvisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toggling, setToggling] = useState(null)

  useEffect(() => {
    if (session?.role !== 'superadmin') {
      navigate('/')
      return
    }
    fetchAdvisors()
      .then(setAdvisors)
      .catch(() => setError('Failed to load advisors'))
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = async (advisor) => {
    setToggling(advisor.id)
    try {
      await toggleAdvisor(advisor.id, !advisor.is_active)
      setAdvisors(prev => prev.map(a => a.id === advisor.id ? { ...a, is_active: !a.is_active } : a))
    } catch {
      // silent — advisor list shows current state
    } finally {
      setToggling(null)
    }
  }

  const totalAdvisors = advisors.length
  const activeAdvisors = advisors.filter(a => a.is_active).length
  const totalClients = advisors.reduce((s, a) => s + a.client_count, 0)
  const totalAUM = advisors.reduce((s, a) => s + a.total_aum, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 md:px-8 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors">
            <ArrowLeft size={16} />
          </button>
          <ShieldCheck size={18} className="text-[#1D6FDB]" />
          <div className="text-base font-bold text-gray-900">Superadmin — Advisor Overview</div>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Advisors', value: totalAdvisors, icon: <Users size={14} /> },
            { label: 'Active', value: activeAdvisors, icon: <CheckCircle size={14} className="text-green-600" /> },
            { label: 'Total Clients', value: totalClients, icon: <Users size={14} /> },
            { label: 'Total AUM', value: fmt.inr(totalAUM), icon: <TrendingUp size={14} /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">{icon} {label}</div>
              <div className="text-xl font-bold text-gray-900">{value}</div>
            </div>
          ))}
        </div>

        {/* Advisor table */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Advisor</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Clients</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">AUM</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Trades</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {advisors.map(a => (
                    <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-gray-900">{a.display_name}</div>
                        <div className="text-xs text-gray-400">@{a.username} {a.city ? `· ${a.city}` : ''} {a.role === 'superadmin' ? '· 👑 superadmin' : ''}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{a.client_count}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{a.active_clients}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt.inr(a.total_aum)}</td>
                      <td className="px-4 py-3 text-right">
                        {a.pending_trades > 0 ? (
                          <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">{a.pending_trades}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {a.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {a.role !== 'superadmin' && (
                            <button
                              onClick={() => handleToggle(a)}
                              disabled={toggling === a.id}
                              className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                              title={a.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {a.is_active ? <XCircle size={14} /> : <CheckCircle size={14} className="text-green-500" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
