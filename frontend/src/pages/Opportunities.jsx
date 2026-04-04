import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronRight,
  CircleDollarSign,
  Loader2,
  Plus,
  Trophy,
  X,
} from 'lucide-react'
import {
  getProspects,
  createProspect,
  updateProspect,
  updateProspectStage,
  convertProspect,
  deleteProspect,
  fmt,
} from '../api/client'

const STAGES = [
  { key: 'prospect',  label: 'Prospect',  color: 'bg-gray-100 text-gray-600',   ring: 'ring-gray-200' },
  { key: 'discovery', label: 'Discovery', color: 'bg-blue-50 text-blue-700',    ring: 'ring-blue-200' },
  { key: 'proposal',  label: 'Proposal',  color: 'bg-amber-50 text-amber-700',  ring: 'ring-amber-200' },
  { key: 'won',       label: 'Won',       color: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200' },
]

const SOURCES = ['referral', 'cold_call', 'inbound', 'event', 'other']

const CARD = 'bg-white rounded-2xl border border-gray-100 shadow-sm'

function ProspectCard({ prospect, onStageChange, onEdit, onConvert, onDelete }) {
  const stage = STAGES.find(s => s.key === prospect.stage)
  const nextStages = STAGES.filter(s => s.key !== prospect.stage && s.key !== 'lost')

  return (
    <div className={`${CARD} p-3 mb-3 group`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{prospect.name}</p>
          {prospect.estimated_aum != null && (
            <p className="text-xs text-gray-500 mt-0.5">{fmt.inr(prospect.estimated_aum)}</p>
          )}
          {prospect.source && (
            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 capitalize">
              {prospect.source.replace('_', ' ')}
            </span>
          )}
        </div>
        <button
          onClick={() => onDelete(prospect.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 shrink-0"
          aria-label="Delete"
        >
          <X size={13} />
        </button>
      </div>

      {prospect.notes && (
        <p className="mt-2 text-xs text-gray-400 line-clamp-2">{prospect.notes}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {nextStages.map(s => (
          <button
            key={s.key}
            onClick={() => onStageChange(prospect.id, s.key)}
            className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            → {s.label}
          </button>
        ))}
        {prospect.stage === 'won' && !prospect.converted_client_id && (
          <button
            onClick={() => onConvert(prospect.id)}
            className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-1"
          >
            <Trophy size={9} /> Convert to Client
          </button>
        )}
        {prospect.converted_client_id && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
            ✓ Converted
          </span>
        )}
      </div>
    </div>
  )
}

function AddProspectModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', estimated_aum: '', source: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: form.name.trim(),
        estimated_aum: form.estimated_aum ? parseFloat(form.estimated_aum) : null,
        source: form.source || null,
        notes: form.notes.trim() || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">New Prospect</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Sharma Family"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estimated AUM (₹)</label>
            <input
              type="number"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.estimated_aum}
              onChange={e => setForm(f => ({ ...f, estimated_aum: e.target.value }))}
              placeholder="e.g. 5000000"
              min="0"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
            >
              <option value="">Select source</option>
              {SOURCES.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Discovery notes, referral context, etc."
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#1D6FDB] text-white rounded-xl py-2 text-sm font-medium hover:bg-[#1a63c7] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Add Prospect
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Opportunities() {
  const navigate = useNavigate()
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      const data = await getProspects()
      setProspects(data)
    } catch {
      setError('Failed to load prospects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleStageChange = async (id, stage) => {
    try {
      const updated = await updateProspectStage(id, stage)
      setProspects(prev => prev.map(p => p.id === id ? updated : p))
    } catch {
      setError('Failed to update stage')
    }
  }

  const handleCreate = async (data) => {
    const created = await createProspect(data)
    setProspects(prev => [created, ...prev])
  }

  const handleConvert = async (id) => {
    try {
      const updated = await convertProspect(id)
      setProspects(prev => prev.map(p => p.id === id ? updated : p))
    } catch {
      setError('Failed to convert prospect')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this prospect?')) return
    try {
      await deleteProspect(id)
      setProspects(prev => prev.filter(p => p.id !== id))
    } catch {
      setError('Failed to delete prospect')
    }
  }

  const byStage = (stageKey) => prospects.filter(p => p.stage === stageKey)

  const totalAum = prospects
    .filter(p => p.stage !== 'lost' && p.estimated_aum)
    .reduce((sum, p) => sum + p.estimated_aum, 0)

  const openCount = prospects.filter(p => !['won', 'lost'].includes(p.stage)).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#1D6FDB]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900">Opportunity Pipeline</h1>
          <p className="text-xs text-gray-400 mt-0.5">{prospects.length} prospects · {openCount} open</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-[#1D6FDB] text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-[#1a63c7] transition-colors"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Add Prospect</span>
        </button>
      </div>

      {/* KPI strip */}
      <div className="px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAGES.map(stage => {
          const items = byStage(stage.key)
          const stageAum = items.filter(p => p.estimated_aum).reduce((s, p) => s + p.estimated_aum, 0)
          return (
            <div key={stage.key} className={`${CARD} p-3`}>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{stage.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{items.length}</p>
              {stageAum > 0 && <p className="text-xs text-gray-400">{fmt.inr(stageAum)}</p>}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="mx-4 sm:mx-6 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Pipeline kanban */}
      <div className="px-4 sm:px-6 pb-8 overflow-x-auto">
        <div className="flex gap-4 min-w-[720px]">
          {STAGES.map(stage => {
            const items = byStage(stage.key)
            return (
              <div key={stage.key} className="flex-1 min-w-[160px]">
                <div className={`flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg ring-1 ${stage.ring} ${stage.color}`}>
                  <span className="text-xs font-semibold">{stage.label}</span>
                  <span className="ml-auto text-xs font-bold">{items.length}</span>
                </div>

                {items.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center">
                    <p className="text-xs text-gray-300">No prospects</p>
                  </div>
                )}

                {items.map(p => (
                  <ProspectCard
                    key={p.id}
                    prospect={p}
                    onStageChange={handleStageChange}
                    onConvert={handleConvert}
                    onDelete={handleDelete}
                  />
                ))}

                {stage.key === 'prospect' && (
                  <button
                    onClick={() => setShowAdd(true)}
                    className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-2 text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus size={12} /> Add
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {showAdd && (
        <AddProspectModal
          onClose={() => setShowAdd(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  )
}
