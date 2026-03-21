import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, MapPin, Tag, CheckCircle, Save } from 'lucide-react'
import { getAdvisorSession, advisorLogout } from '../auth'
import { updateAdvisorProfile } from '../api/client'

export default function AdvisorProfilePage() {
  const navigate = useNavigate()
  const session = getAdvisorSession()

  const [displayName, setDisplayName] = useState(session?.displayName || '')
  const [city, setCity] = useState(session?.city || '')
  const [region, setRegion] = useState(session?.region || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    if (!displayName.trim()) { setError('Display name is required.'); return }
    setSaving(true); setError(null)
    try {
      const updated = await updateAdvisorProfile({ display_name: displayName.trim(), city: city.trim(), region: region.trim() })
      // Sync session in localStorage
      const newSession = {
        ...session,
        displayName: updated.display_name,
        city: updated.city || '',
        region: updated.region || '',
      }
      localStorage.setItem('aria_advisor_session', JSON.stringify(newSession))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const initials = (session?.displayName || 'A').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-800">My Profile</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Avatar + identity */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1D6FDB] to-blue-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{session?.displayName}</div>
            <div className="text-sm text-gray-400">@{session?.username}</div>
            {session?.role === 'superadmin' && (
              <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">Superadmin</span>
            )}
          </div>
        </div>

        {/* Read-only info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Account Info</div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <User size={14} className="text-gray-400 flex-shrink-0" />
            <span>Username: <span className="font-medium">@{session?.username}</span></span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Tag size={14} className="text-gray-400 flex-shrink-0" />
            <span>Referral Code: <span className="font-semibold tracking-widest text-[#1D6FDB]">{session?.referral_code || '—'}</span></span>
          </div>
        </div>

        {/* Editable fields */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Edit Profile</div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Display Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">City</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="e.g. Hyderabad"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Region / State</label>
            <input
              type="text"
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="e.g. Telangana"
            />
          </div>

          {error && <div className="text-xs text-red-600">{error}</div>}
          {saved && (
            <div className="text-xs text-teal-600 flex items-center gap-1">
              <CheckCircle size={12} /> Profile saved
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1D6FDB] text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  )
}
