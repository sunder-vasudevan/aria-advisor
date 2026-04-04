import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  X,
} from 'lucide-react'
import {
  getTasks,
  createTask,
  markTaskDone,
  deleteTask,
  fmt,
} from '../api/client'

const CARD = 'bg-white rounded-2xl border border-gray-100 shadow-sm'

const WORKFLOWS = ['onboarding', 'review', 'trade', 'compliance', 'general']

function isOverdue(dueDate) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

function isDueSoon(dueDate) {
  if (!dueDate) return false
  const d = new Date(dueDate)
  const today = new Date(new Date().toDateString())
  const diff = (d - today) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 7
}

function AddTaskModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    title: '',
    due_date_day: '',
    due_date_month: '',
    due_date_year: String(new Date().getFullYear()),
    linked_workflow: '',
  })
  const [saving, setSaving] = useState(false)

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i)
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]

  const buildDueDate = () => {
    if (!form.due_date_day || !form.due_date_month || !form.due_date_year) return null
    const mm = String(form.due_date_month).padStart(2, '0')
    const dd = String(form.due_date_day).padStart(2, '0')
    return `${form.due_date_year}-${mm}-${dd}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onSave({
        title: form.title.trim(),
        due_date: buildDueDate(),
        linked_workflow: form.linked_workflow || null,
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
          <h2 className="text-base font-semibold text-gray-900">New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Send annual review pack to Sharma"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
            <div className="flex gap-2">
              <select
                className="flex-1 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.due_date_day}
                onChange={e => setForm(f => ({ ...f, due_date_day: e.target.value }))}
              >
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                className="flex-1 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.due_date_month}
                onChange={e => setForm(f => ({ ...f, due_date_month: e.target.value }))}
              >
                <option value="">Month</option>
                {months.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                className="flex-1 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.due_date_year}
                onChange={e => setForm(f => ({ ...f, due_date_year: e.target.value }))}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Workflow</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.linked_workflow}
              onChange={e => setForm(f => ({ ...f, linked_workflow: e.target.value }))}
            >
              <option value="">None</option>
              {WORKFLOWS.map(w => (
                <option key={w} value={w}>{w.replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
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
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TaskRow({ task, onDone, onDelete }) {
  const overdue = task.status === 'pending' && isOverdue(task.due_date)
  const soon = task.status === 'pending' && !overdue && isDueSoon(task.due_date)
  const done = task.status === 'done'

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${done ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
      <button
        onClick={() => !done && onDone(task.id)}
        className={`mt-0.5 shrink-0 transition-colors ${done ? 'text-emerald-500 cursor-default' : 'text-gray-300 hover:text-emerald-500'}`}
        aria-label={done ? 'Done' : 'Mark done'}
      >
        {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {task.due_date && (
            <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : soon ? 'text-amber-600' : 'text-gray-400'}`}>
              {overdue ? '⚠ ' : ''}
              {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
            </span>
          )}
          {task.linked_workflow && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 capitalize">
              {task.linked_workflow}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="shrink-0 text-gray-200 hover:text-red-400 transition-colors"
        aria-label="Delete task"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function TasksPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('pending')
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      const data = await getTasks({ status: filter === 'all' ? undefined : filter })
      setTasks(data)
    } catch {
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    load()
  }, [filter])

  const handleCreate = async (data) => {
    const created = await createTask(data)
    setTasks(prev => [created, ...prev])
  }

  const handleDone = async (id) => {
    try {
      const updated = await markTaskDone(id)
      setTasks(prev => prev.map(t => t.id === id ? updated : t))
    } catch {
      setError('Failed to update task')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch {
      setError('Failed to delete task')
    }
  }

  const pending = tasks.filter(t => t.status === 'pending')
  const done = tasks.filter(t => t.status === 'done')
  const overdue = pending.filter(t => isOverdue(t.due_date))
  const due7d = pending.filter(t => isDueSoon(t.due_date))

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
          <h1 className="text-lg font-semibold text-gray-900">Task Queue</h1>
          <p className="text-xs text-gray-400 mt-0.5">{pending.length} pending · {overdue.length} overdue</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-[#1D6FDB] text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-[#1a63c7] transition-colors"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Add Task</span>
        </button>
      </div>

      {/* KPI strip */}
      <div className="px-4 sm:px-6 py-4 grid grid-cols-3 gap-3">
        <div className={`${CARD} p-3`}>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Pending</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{pending.length}</p>
        </div>
        <div className={`${CARD} p-3`}>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Due ≤ 7d</p>
          <p className={`text-xl font-bold mt-1 ${due7d.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
            {due7d.length}
          </p>
        </div>
        <div className={`${CARD} p-3`}>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Overdue</p>
          <p className={`text-xl font-bold mt-1 ${overdue.length > 0 ? 'text-red-500' : 'text-gray-900'}`}>
            {overdue.length}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 sm:px-6 mb-4 flex gap-2">
        {['pending', 'done', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-[#1D6FDB] text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-4 sm:mx-6 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Task list */}
      <div className="px-4 sm:px-6 pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[#1D6FDB]" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No {filter === 'all' ? '' : filter} tasks</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(t => (
              <TaskRow key={t.id} task={t} onDone={handleDone} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddTaskModal
          onClose={() => setShowAdd(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  )
}
