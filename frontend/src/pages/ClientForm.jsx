import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader } from 'lucide-react'
import { getClient, createClient, updateClient } from '../api/client'

const SEGMENTS = ['Retail', 'HNI']
const RISK_LABELS = ['', 'Very Conservative', 'Conservative', 'Conservative', 'Moderate', 'Moderate', 'Moderate', 'Aggressive', 'Aggressive', 'Very Aggressive', 'Very Aggressive']

function deriveAge(dob) {
  if (!dob) return ''
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age > 0 ? age : ''
}

const empty = {
  name: '',
  date_of_birth: '',
  age: '',
  segment: 'Retail',
  risk_score: 5,
  phone: '',
  email: '',
  address: '',
  city: '',
  pincode: '',
  pan_number: '',
}

export default function ClientForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    getClient(id)
      .then(client => {
        setForm({
          name: client.name || '',
          date_of_birth: client.date_of_birth || '',
          age: client.age || '',
          segment: client.segment || 'Retail',
          risk_score: client.risk_score || 5,
          phone: client.phone || '',
          email: client.email || '',
          address: client.address || '',
          city: client.city || '',
          pincode: client.pincode || '',
          pan_number: client.pan_number || '',
        })
      })
      .catch(() => setError('Failed to load client'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const set = (field, value) => setForm(f => {
    const updated = { ...f, [field]: value }
    if (field === 'date_of_birth' && value) {
      const age = deriveAge(value)
      if (age) updated.age = age
    }
    return updated
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      age: Number(form.age),
      segment: form.segment,
      risk_score: Number(form.risk_score),
      phone: form.phone || null,
      email: form.email || null,
      date_of_birth: form.date_of_birth || null,
      address: form.address || null,
      city: form.city || null,
      pincode: form.pincode || null,
      pan_number: form.pan_number || null,
    }

    try {
      const client = isEdit
        ? await updateClient(id, payload)
        : await createClient(payload)
      navigate(`/clients/${client.id}`)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save client')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-white animate-pulse">Loading client…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-navy-950 px-4 md:px-8 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(isEdit ? `/clients/${id}` : '/')}
          className="flex items-center gap-1.5 text-navy-300 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          <span className="hidden md:inline">{isEdit ? 'Back to Client' : 'Back to Client Book'}</span>
          <span className="md:hidden">Back</span>
        </button>
        <div className="flex-1">
          <div className="text-white font-semibold text-base">
            {isEdit ? 'Edit Client' : 'Add New Client'}
          </div>
          <div className="text-navy-400 text-xs">FEAT-101</div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 md:px-0 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Core identity */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Identity</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => set('date_of_birth', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                <input
                  required
                  type="number"
                  min="18"
                  max="100"
                  value={form.age}
                  onChange={e => set('age', e.target.value)}
                  placeholder="Auto-filled from DOB"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
              <input
                type="text"
                value={form.pan_number}
                onChange={e => set('pan_number', e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-navy-300"
              />
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Contact</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="priya@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="Street / Building / Flat"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  placeholder="Mumbai"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={e => set('pincode', e.target.value)}
                  placeholder="400001"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                />
              </div>
            </div>
          </section>

          {/* Advisory profile */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Advisory Profile</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Segment *</label>
              <div className="flex gap-3">
                {SEGMENTS.map(seg => (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => set('segment', seg)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.segment === seg
                        ? seg === 'HNI'
                          ? 'bg-amber-50 border-amber-400 text-amber-800'
                          : 'bg-navy-50 border-navy-400 text-navy-800'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {seg}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risk Score * — <span className="font-semibold text-gray-900">{form.risk_score}/10</span>
                <span className="ml-2 text-gray-400 font-normal">{RISK_LABELS[form.risk_score]}</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={form.risk_score}
                onChange={e => set('risk_score', Number(e.target.value))}
                className="w-full accent-navy-950"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Conservative</span>
                <span>Moderate</span>
                <span>Aggressive</span>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3 pb-8">
            <button
              type="button"
              onClick={() => navigate(isEdit ? `/clients/${id}` : '/')}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-navy-950 text-white rounded-lg text-sm font-medium hover:bg-navy-800 disabled:opacity-60 transition-colors"
            >
              {saving
                ? <><Loader size={14} className="animate-spin" /> Saving…</>
                : <><Save size={14} /> {isEdit ? 'Save Changes' : 'Add Client'}</>
              }
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
