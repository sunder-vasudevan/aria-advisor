import ARiALogo from '../components/ARiALogo'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, HelpCircle, LogOut, Receipt, RefreshCw, CreditCard, CheckCircle, AlertTriangle, Plus, X } from 'lucide-react'
import { getAllInvoices, getFeeConfig, setFeeConfig, createInvoice, collectInvoice } from '../api/billing'
import { getClients, fmt } from '../api/client'
import { getAdvisorSession, advisorLogout } from '../auth'

const FEE_TYPE_LABELS = { aum: 'AUM %', retainer: 'Fixed Retainer', per_trade: 'Per-Trade', onboarding: 'Onboarding' }
const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  waived: 'bg-gray-100 text-gray-500',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function CreateInvoiceModal({ clients, feeConfig, onClose, onCreated, showToast }) {
  const [form, setForm] = useState({
    client_id: '',
    fee_type: feeConfig?.fee_type || 'aum',
    rate: feeConfig?.rate ?? 1.0,
    billing_period: feeConfig?.billing_period || 'monthly',
    description: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.client_id) { showToast('Select a client', 'error'); return }
    setSaving(true)
    try {
      await createInvoice(form.client_id, {
        fee_type: form.fee_type,
        rate: parseFloat(form.rate),
        billing_period: form.billing_period,
        description: form.description || undefined,
      })
      showToast('Invoice created')
      onCreated()
    } catch (e) {
      showToast(e?.response?.data?.detail || 'Failed to create invoice', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-900">Create Invoice</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Client</label>
            <select value={form.client_id} onChange={e => set('client_id', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Fee Type</label>
              <select value={form.fee_type} onChange={e => set('fee_type', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {Object.entries(FEE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                {form.fee_type === 'aum' ? 'Rate (%)' : 'Amount (₹)'}
              </label>
              <input type="number" step="0.01" value={form.rate} onChange={e => set('rate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Period</label>
            <select value={form.billing_period} onChange={e => set('billing_period', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Description (optional — for one-off invoices)</label>
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="e.g. Advisory consultation – Apr 2026"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 px-4 py-2 bg-[#1D6FDB] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  const navigate = useNavigate()
  const session = getAdvisorSession()

  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [feeConfig, setFeeConfigState] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [configEdit, setConfigEdit] = useState(false)
  const [configForm, setConfigForm] = useState({ fee_type: 'aum', rate: 1.0, billing_period: 'monthly' })
  const [savingConfig, setSavingConfig] = useState(false)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [collectingId, setCollectingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [invRes, clientRes, cfgRes] = await Promise.all([getAllInvoices(), getClients(), getFeeConfig()])
      setInvoices(invRes.data || [])
      // getClients() returns a plain array directly
      setClients(Array.isArray(clientRes) ? clientRes : (clientRes.clients || clientRes.data || []))
      const cfg = cfgRes.data
      setFeeConfigState(cfg)
      if (cfg) setConfigForm({ fee_type: cfg.fee_type, rate: cfg.rate, billing_period: cfg.billing_period })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)

  const totalReceivables = invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0)
  const collectedMonth = invoices.filter(i => {
    if (i.status !== 'paid' || !i.paid_at) return false
    const d = new Date(i.paid_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((s, i) => s + i.amount, 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length
  const clientsBilled = new Set(invoices.map(i => i.client_id)).size

  const handleSaveConfig = async () => {
    setSavingConfig(true)
    try {
      const res = await setFeeConfig(configForm)
      setFeeConfigState(res.data)
      setConfigEdit(false)
      showToast('Fee config saved')
    } catch { showToast('Failed to save config', 'error') }
    finally { setSavingConfig(false) }
  }

  const handleGenerateAll = async () => {
    if (!feeConfig) { showToast('Set a default fee config first', 'error'); return }
    setGeneratingAll(true)
    let count = 0
    for (const c of clients) {
      try { await createInvoice(c.id, {}); count++ } catch {}
    }
    showToast(`Generated ${count} invoice${count !== 1 ? 's' : ''}`)
    await loadData()
    setGeneratingAll(false)
  }

  const handleCollect = async (inv) => {
    setCollectingId(inv.id)
    try {
      await collectInvoice(inv.id)
      showToast(`Collected ${fmt.inr(inv.amount)} from ${inv.client_name}`)
      await loadData()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Collection failed'
      showToast(msg, 'error')
    } finally { setCollectingId(null) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-shrink-0">
          <ARiALogo className="text-[#1D6FDB] font-bold text-base tracking-tight" />
          <span className="hidden md:block text-xs text-gray-400">Advisor Workbench</span>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 text-sm font-medium transition-colors">
            <TrendingUp size={14} /> Clients
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-[#1D6FDB] text-sm font-medium">
            <Receipt size={14} /> Billing
          </button>
          <button onClick={() => navigate('/help')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 text-sm font-medium transition-colors">
            <HelpCircle size={14} /> Help
          </button>
        </nav>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-[#1D6FDB] flex items-center justify-center text-xs font-bold">
              {(session?.displayName || 'R')[0]}
            </div>
            <button onClick={() => { advisorLogout(); navigate('/login') }} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-16 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {showCreateModal && (
        <CreateInvoiceModal
          clients={clients}
          feeConfig={feeConfig}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); loadData() }}
          showToast={showToast}
        />
      )}

      <div className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Billing</h1>
            <p className="text-sm text-gray-500 mt-0.5">Fee config, invoices, and collections</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1D6FDB] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
            >
              <Plus size={14} /> New Invoice
            </button>
            <button
              onClick={handleGenerateAll}
              disabled={generatingAll || !feeConfig || clients.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              title={!feeConfig ? 'Set a default fee config first' : 'Generate invoices for all clients using stored configs'}
            >
              {generatingAll ? <RefreshCw size={14} className="animate-spin" /> : <Receipt size={14} />}
              Generate All
            </button>
          </div>
        </div>

        {/* KPI bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Receivables', value: fmt.inr(totalReceivables), icon: CreditCard, color: 'text-amber-600' },
            { label: 'Collected This Month', value: fmt.inr(collectedMonth), icon: CheckCircle, color: 'text-green-600' },
            { label: 'Overdue', value: overdueCount, icon: AlertTriangle, color: 'text-red-600' },
            { label: 'Clients Billed', value: clientsBilled, icon: TrendingUp, color: 'text-blue-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={color} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
              <div className="text-lg font-bold text-gray-900">{value}</div>
            </div>
          ))}
        </div>

        {/* Fee Config card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Default Fee Configuration</h2>
              <p className="text-xs text-gray-400 mt-0.5">Applies to all clients unless a per-client override is set in Client 360° → Billing tab</p>
            </div>
            <button onClick={() => setConfigEdit(!configEdit)} className="text-xs text-[#1D6FDB] hover:underline flex-shrink-0">
              {configEdit ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {configEdit ? (
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Fee Type</label>
                <select value={configForm.fee_type} onChange={e => setConfigForm(f => ({ ...f, fee_type: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  {Object.entries(FEE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">{configForm.fee_type === 'aum' ? 'Rate (%)' : 'Rate (₹)'}</label>
                <input type="number" step="0.01" value={configForm.rate} onChange={e => setConfigForm(f => ({ ...f, rate: parseFloat(e.target.value) }))}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-24" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Period</label>
                <select value={configForm.billing_period} onChange={e => setConfigForm(f => ({ ...f, billing_period: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              <button onClick={handleSaveConfig} disabled={savingConfig} className="px-4 py-1.5 bg-[#1D6FDB] text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {savingConfig ? 'Saving…' : 'Save'}
              </button>
            </div>
          ) : feeConfig ? (
            <div className="flex flex-wrap gap-6 text-sm">
              <div><span className="text-gray-500">Type: </span><span className="font-medium">{FEE_TYPE_LABELS[feeConfig.fee_type]}</span></div>
              <div><span className="text-gray-500">Rate: </span><span className="font-medium">{feeConfig.fee_type === 'aum' ? `${feeConfig.rate}%` : fmt.inr(feeConfig.rate)}</span></div>
              <div><span className="text-gray-500">Period: </span><span className="font-medium capitalize">{feeConfig.billing_period}</span></div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No default fee config set. Click Edit to configure, or use New Invoice for one-off billing.</p>
          )}
        </div>

        {/* Invoice table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Invoices</h2>
            <div className="flex gap-1">
              {['all', 'pending', 'paid', 'overdue', 'waived'].map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${filter === s ? 'bg-blue-50 text-[#1D6FDB]' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-sm text-gray-400 mb-3">No invoices{filter !== 'all' ? ` with status "${filter}"` : ' yet'}.</div>
              {filter === 'all' && (
                <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1D6FDB] text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                  <Plus size={14} /> Create first invoice
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Client</th>
                      <th className="text-left px-4 py-2 font-medium">Type</th>
                      <th className="text-left px-4 py-2 font-medium">Amount</th>
                      <th className="text-left px-4 py-2 font-medium">Period</th>
                      <th className="text-left px-4 py-2 font-medium">Description</th>
                      <th className="text-left px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <button onClick={() => navigate(`/clients/${inv.client_id}`)} className="hover:text-[#1D6FDB] hover:underline">
                            {inv.client_name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{FEE_TYPE_LABELS[inv.fee_type] || inv.fee_type}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{fmt.inr(inv.amount)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{inv.period_start} → {inv.period_end}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">{inv.description}</td>
                        <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                        <td className="px-4 py-3 text-right">
                          {inv.status === 'pending' && (
                            <button
                              onClick={() => handleCollect(inv)}
                              disabled={collectingId === inv.id}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              {collectingId === inv.id ? '…' : 'Collect'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {filtered.map(inv => (
                  <div key={inv.id} className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <button onClick={() => navigate(`/clients/${inv.client_id}`)} className="font-medium text-gray-900 hover:text-[#1D6FDB]">
                        {inv.client_name}
                      </button>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="text-xs text-gray-500 mb-1">{FEE_TYPE_LABELS[inv.fee_type]} · {inv.period_start} → {inv.period_end}</div>
                    {inv.description && <div className="text-xs text-gray-400 mb-2 truncate">{inv.description}</div>}
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">{fmt.inr(inv.amount)}</span>
                      {inv.status === 'pending' && (
                        <button onClick={() => handleCollect(inv)} disabled={collectingId === inv.id}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50">
                          {collectingId === inv.id ? '…' : 'Collect'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
        <button onClick={() => navigate('/')} className="flex-1 flex flex-col items-center justify-center py-3 text-gray-500 text-xs gap-0.5">
          <TrendingUp size={20} className="mb-0.5" />
          Clients
        </button>
        <button className="flex-1 flex flex-col items-center justify-center py-3 text-[#1D6FDB] text-xs gap-0.5">
          <Receipt size={20} className="mb-0.5" />
          Billing
        </button>
        <button onClick={() => navigate('/help')} className="flex-1 flex flex-col items-center justify-center py-3 text-gray-500 text-xs gap-0.5">
          <HelpCircle size={20} className="mb-0.5" />
          Help
        </button>
      </nav>
    </div>
  )
}
