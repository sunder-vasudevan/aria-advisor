import { useEffect, useState } from 'react'
import { getInteractions, createInteraction, deleteInteraction } from '../api/client'
import {
  Phone, Mail, Users, ArrowRight, Plus, X, Loader2, Trash2,
  CalendarDays, Clock, CheckCircle2, AlertCircle
} from 'lucide-react'

const TYPE_META = {
  call:       { label: 'Call',       icon: Phone,     color: 'bg-blue-100 text-blue-700' },
  email:      { label: 'Email',      icon: Mail,      color: 'bg-purple-100 text-purple-700' },
  meeting:    { label: 'Meeting',    icon: Users,     color: 'bg-emerald-100 text-emerald-700' },
  follow_up:  { label: 'Follow-up',  icon: ArrowRight, color: 'bg-amber-100 text-amber-700' },
}

function TypeBadge({ type }) {
  const meta = TYPE_META[type] || TYPE_META.call
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
      <Icon size={10} />
      {meta.label}
    </span>
  )
}

function InteractionCard({ interaction, onDelete }) {
  const today = new Date()
  const due = interaction.next_action_due ? new Date(interaction.next_action_due) : null
  const isOverdue = due && due < today
  const daysOverdue = due ? Math.floor((today - due) / 86400000) : 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <TypeBadge type={interaction.interaction_type} />
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <CalendarDays size={10} />
            {new Date(interaction.interaction_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {interaction.duration_minutes && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={10} />
              {interaction.duration_minutes}m
            </span>
          )}
        </div>
        <button
          onClick={() => onDelete(interaction.id)}
          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="text-sm font-semibold text-gray-900">{interaction.subject}</div>

      {interaction.notes && (
        <div className="text-xs text-gray-600 leading-relaxed">{interaction.notes}</div>
      )}

      {interaction.outcome && (
        <div className="flex items-start gap-1.5">
          <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
          <span className="text-xs text-gray-700"><span className="font-medium">Outcome:</span> {interaction.outcome}</span>
        </div>
      )}

      {interaction.next_action && (
        <div className={`flex items-start gap-1.5 px-2.5 py-2 rounded-lg ${
          isOverdue ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
        }`}>
          {isOverdue
            ? <AlertCircle size={12} className="text-red-500 mt-0.5 flex-shrink-0" />
            : <ArrowRight size={12} className="text-amber-600 mt-0.5 flex-shrink-0" />
          }
          <div className="text-xs">
            <span className={`font-medium ${isOverdue ? 'text-red-700' : 'text-amber-800'}`}>Next: </span>
            <span className={isOverdue ? 'text-red-700' : 'text-amber-800'}>{interaction.next_action}</span>
            {due && (
              <span className={`ml-1.5 ${isOverdue ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
                {isOverdue
                  ? `(${daysOverdue}d overdue)`
                  : `(by ${due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`
                }
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function LogInteractionModal({ clientId, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    interaction_type: 'call',
    interaction_date: today,
    duration_minutes: '',
    subject: '',
    notes: '',
    outcome: '',
    next_action: '',
    next_action_due: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const showDuration = ['call', 'meeting'].includes(form.interaction_type)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subject.trim()) { setError('Subject is required'); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        notes: form.notes || null,
        outcome: form.outcome || null,
        next_action: form.next_action || null,
        next_action_due: form.next_action_due || null,
      }
      const saved = await createInteraction(clientId, payload)
      onSave(saved)
    } catch {
      setError('Failed to save interaction')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="text-sm font-semibold text-gray-900">Log Interaction</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Type + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={form.interaction_type}
                onChange={e => set('interaction_type', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-950"
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="follow_up">Follow-up</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={form.interaction_date}
                onChange={e => set('interaction_date', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-950"
                required
              />
            </div>
          </div>

          {/* Duration (calls/meetings only) */}
          {showDuration && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 30"
                value={form.duration_minutes}
                onChange={e => set('duration_minutes', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-950"
              />
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject <span className="text-red-400">*</span></label>
            <input
              type="text"
              placeholder="e.g. Reviewed portfolio drift, discussed rebalancing"
              value={form.subject}
              onChange={e => set('subject', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-950"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              rows={3}
              placeholder="Key discussion points, client sentiment, concerns raised…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-950 resize-none"
            />
          </div>

          {/* Outcome */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Outcome</label>
            <input
              type="text"
              placeholder="e.g. Client agreed to increase SIP by ₹10,000"
              value={form.outcome}
              onChange={e => set('outcome', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-950"
            />
          </div>

          {/* Next action + due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Next Action</label>
              <input
                type="text"
                placeholder="e.g. Send rebalancing proposal"
                value={form.next_action}
                onChange={e => set('next_action', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input
                type="date"
                value={form.next_action_due}
                onChange={e => set('next_action_due', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-950"
              />
            </div>
          </div>

          {error && <div className="text-xs text-red-600">{error}</div>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-navy-950 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save Interaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function InteractionsPanel({ clientId }) {
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getInteractions(clientId)
      .then(setInteractions)
      .finally(() => setLoading(false))
  }, [clientId])

  const handleSave = (newInteraction) => {
    setInteractions(prev => [newInteraction, ...prev])
    setShowModal(false)
  }

  const handleDelete = async (interactionId) => {
    await deleteInteraction(clientId, interactionId)
    setInteractions(prev => prev.filter(i => i.id !== interactionId))
  }

  const filtered = filter === 'all'
    ? interactions
    : interactions.filter(i => i.interaction_type === filter)

  const overdueCount = interactions.filter(i => {
    if (!i.next_action_due) return false
    return new Date(i.next_action_due) < new Date()
  }).length

  if (loading) {
    return <div className="text-sm text-gray-400 py-8 text-center">Loading interactions…</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            Interaction Log ({interactions.length})
          </span>
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              <AlertCircle size={10} />
              {overdueCount} overdue
            </span>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-950 text-white text-xs font-medium rounded-lg hover:bg-navy-800 transition-colors"
        >
          <Plus size={12} />
          Log Interaction
        </button>
      </div>

      {/* Filter tabs */}
      {interactions.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {['all', 'call', 'email', 'meeting', 'follow_up'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-navy-950 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : TYPE_META[f].label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-sm text-gray-400 py-10 text-center">
          {interactions.length === 0
            ? 'No interactions logged yet. Log your first call or meeting.'
            : `No ${filter} interactions recorded.`
          }
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(i => (
            <InteractionCard key={i.id} interaction={i} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <LogInteractionModal
          clientId={clientId}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
