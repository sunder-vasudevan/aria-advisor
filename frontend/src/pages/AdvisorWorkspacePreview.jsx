import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    BarChart3,
    Bell,
    BellRing,
    CalendarClock,
    CheckCircle,
    CheckCircle2,
    ChevronRight,
    Database,
    Layers3,
    ListTodo,
    Sparkles,
    Users,
    AlertTriangle,
    UserMinus,
    X,
    XCircle,
} from 'lucide-react'
import {
    getClients,
    getBriefing,
    getAdvisorNotifications,
    markNotificationRead,
    delinkClient,
    getClient,
    getGoals,
    getTrades,
    getMeetingPrep,
    getInteractions,
    getProspects,
    getTaskSummary,
    fmt,
} from '../api/client'

const CARD = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'

const NOTIF_CONFIG = {
    trade_submitted:  { emoji: '🔔', border: 'border-amber-400',  bg: 'bg-amber-50' },
    trade_approved:   { emoji: '✅', border: 'border-green-400',  bg: 'bg-green-50' },
    trade_rejected:   { emoji: '❌', border: 'border-red-400',    bg: 'bg-red-50' },
    client_delinked:  { emoji: '🔗', border: 'border-orange-400', bg: 'bg-orange-50' },
}

function NotificationBell({ notifications, onOpen, unreadCount }) {
    return (
        <button
            onClick={onOpen}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
        >
            {unreadCount > 0 ? <BellRing size={18} /> : <Bell size={18} />}
            {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    )
}

function NotificationDrawer({ notifications, open, onClose, onMarkRead, navigate }) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/20" onClick={onClose} />
            <div className="relative w-[380px] max-w-full bg-white border-l border-gray-200 shadow-xl flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-900">Notifications</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2">
                            <CheckCircle size={32} className="text-gray-200" />
                            <span className="text-sm font-medium text-gray-400">All caught up</span>
                        </div>
                    ) : notifications.map(n => {
                        const cfg = NOTIF_CONFIG[n.notification_type] || { emoji: '📋', border: 'border-gray-300', bg: 'bg-white' }
                        return (
                            <button
                                key={n.id}
                                className={`w-full text-left px-4 py-3 flex items-start gap-3 border-l-4 ${n.read ? 'bg-white border-transparent' : `${cfg.bg} ${cfg.border}`} hover:bg-gray-50 transition-colors`}
                                onClick={() => {
                                    onMarkRead(n.id)
                                    if (n.client_id) navigate(`/clients/${n.client_id}`)
                                    onClose()
                                }}
                            >
                                <span className="text-base flex-shrink-0 mt-0.5">{cfg.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm ${n.read ? 'text-gray-600' : 'font-semibold text-gray-900'}`}>{n.message}</div>
                                    {n.created_at && (
                                        <div className="text-xs text-gray-400 mt-0.5">
                                            {new Date(n.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                                {!n.read && <span className="w-2 h-2 rounded-full bg-[#1D6FDB] flex-shrink-0 mt-1.5" />}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default function AdvisorWorkspacePreview() {
    const navigate = useNavigate()
    const session = (() => { try { return JSON.parse(localStorage.getItem('aria_advisor_session') || '{}') } catch { return {} } })()
    const advisorName = session.displayName || session.username || 'Advisor'
    const advisorUsername = session.username || 'rm_001'

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [clients, setClients] = useState([])
    const [briefing, setBriefing] = useState(null)
    const [notifications, setNotifications] = useState([])
    const [notifOpen, setNotifOpen] = useState(false)
    const [openOpps, setOpenOpps] = useState(null)
    const [tasksDue7d, setTasksDue7d] = useState(null)
    const [selectedClientId, setSelectedClientId] = useState(null)
    const [selectedData, setSelectedData] = useState({ client: null, goals: [], trades: [], meetingPrep: null, interactions: [] })
    const [actionStatus, setActionStatus] = useState('')
    const [search, setSearch] = useState('')
    const [segmentFilter, setSegmentFilter] = useState('All')
    const [delinkConfirm, setDelinkConfirm] = useState(null) // client id being confirmed
    const notifTimer = useRef(null)

    const fetchNotifications = async () => {
        try {
            const data = await getAdvisorNotifications(20)
            setNotifications(data?.notifications || [])
        } catch {}
    }

    useEffect(() => {
        let alive = true
        ;(async () => {
            try {
                setLoading(true)
                const [clientsRes, briefingRes, notifRes, prospectsRes, taskRes] = await Promise.allSettled([
                    getClients(),
                    getBriefing(advisorUsername),
                    getAdvisorNotifications(20),
                    getProspects(),
                    getTaskSummary(),
                ])
                if (!alive) return
                const list = clientsRes.status === 'fulfilled' && Array.isArray(clientsRes.value) ? clientsRes.value : []
                setClients(list)
                setBriefing(briefingRes.status === 'fulfilled' ? briefingRes.value : null)
                setNotifications(notifRes.status === 'fulfilled' ? (notifRes.value?.notifications || []) : [])
                if (prospectsRes.status === 'fulfilled' && Array.isArray(prospectsRes.value)) {
                    setOpenOpps(prospectsRes.value.filter(p => !['won', 'lost'].includes(p.stage)).length)
                }
                if (taskRes.status === 'fulfilled') {
                    setTasksDue7d(taskRes.value?.due_within_7d ?? null)
                }
                if (list.length > 0) setSelectedClientId(list[0].id)
                if (clientsRes.status === 'rejected') setError('Failed to load clients from backend.')
                else if (briefingRes.status === 'rejected') setActionStatus('Briefing unavailable (AI key not configured). Clients loaded successfully.')
            } catch {
                if (!alive) return
                setError('Failed to load advisor workspace data.')
            } finally {
                if (alive) setLoading(false)
            }
        })()
        notifTimer.current = setInterval(fetchNotifications, 60000)
        return () => { alive = false; clearInterval(notifTimer.current) }
    }, [])

    useEffect(() => {
        if (!selectedClientId) return
        let alive = true
        ;(async () => {
            try {
                const [client, goals, trades, meetingPrep, interactions] = await Promise.allSettled([
                    getClient(selectedClientId),
                    getGoals(selectedClientId),
                    getTrades(selectedClientId),
                    getMeetingPrep(selectedClientId),
                    getInteractions(selectedClientId),
                ])
                if (!alive) return
                setSelectedData({
                    client: client.status === 'fulfilled' ? client.value : null,
                    goals: goals.status === 'fulfilled' && Array.isArray(goals.value) ? goals.value : [],
                    trades: trades.status === 'fulfilled' && Array.isArray(trades.value) ? trades.value : [],
                    meetingPrep: meetingPrep.status === 'fulfilled' ? meetingPrep.value : null,
                    interactions: interactions.status === 'fulfilled' && Array.isArray(interactions.value) ? interactions.value : [],
                })
            } catch {
                if (!alive) return
            }
        })()
        return () => { alive = false }
    }, [selectedClientId])

    const handleMarkRead = async (id) => {
        try {
            await markNotificationRead(id)
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        } catch {}
    }

    const handleDelink = async (clientId) => {
        try {
            await delinkClient(clientId)
            setClients(prev => prev.filter(c => c.id !== clientId))
            setDelinkConfirm(null)
            setActionStatus('Client delinked — they will appear as unassigned.')
            setTimeout(() => setActionStatus(''), 4000)
        } catch {
            setActionStatus('Failed to delink client.')
            setDelinkConfirm(null)
        }
    }

    const totalAum = useMemo(() => clients.reduce((sum, c) => sum + Number(c.total_value || 0), 0), [clients])
    const attentionCount = useMemo(() => clients.filter(c => Number(c.urgency_score || 0) > 0).length, [clients])
    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

    const filteredClients = useMemo(() => {
        return clients.filter(c => {
            const matchName = c.name.toLowerCase().includes(search.toLowerCase())
            const matchSeg = segmentFilter === 'All' || c.segment === segmentFilter
            return matchName && matchSeg
        })
    }, [clients, search, segmentFilter])

    const pipeline = useMemo(() => {
        const intake = clients.filter(c => Number(c.interaction_count || 0) === 0).length
        const review = clients.filter(c => Number(c.urgency_score || 0) > 0).length
        const proposed = selectedData.trades.filter(t => t.status === 'draft').length
        const awaiting = selectedData.trades.filter(t => t.status === 'submitted').length
        const compliance = clients.filter(c => Number(c.risk_score || 0) >= 7).length
        const completed = Math.max(0, clients.length - intake)
        return [
            { stage: 'Intake', count: intake, tone: 'bg-blue-100 text-blue-700' },
            { stage: 'Review', count: review, tone: 'bg-amber-100 text-amber-700' },
            { stage: 'Proposed', count: proposed, tone: 'bg-violet-100 text-violet-700' },
            { stage: 'Awaiting Client', count: awaiting, tone: 'bg-cyan-100 text-cyan-700' },
            { stage: 'Compliance', count: compliance, tone: 'bg-rose-100 text-rose-700' },
            { stage: 'Completed', count: completed, tone: 'bg-emerald-100 text-emerald-700' },
        ]
    }, [clients, selectedData.trades])

    const focusClients = useMemo(() => [...clients].sort((a, b) => Number(b.urgency_score || 0) - Number(a.urgency_score || 0)).slice(0, 5), [clients])

    const todayDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sticky header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-[#1D6FDB] tracking-tight">ARIA</span>
                    <span className="text-gray-300 hidden sm:block">|</span>
                    <span className="text-sm font-medium text-gray-700 hidden sm:block">Workspace Preview</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 hidden sm:block">{advisorName}</span>
                    <NotificationBell notifications={notifications} onOpen={() => setNotifOpen(true)} unreadCount={unreadCount} />
                    <Link to="/billing" className="text-xs font-semibold text-gray-500 hover:text-gray-800 hidden sm:block">Billing</Link>
                    <Link to="/" className="text-xs font-semibold text-[#1D6FDB] hover:underline hidden sm:block">← Dashboard</Link>
                </div>
            </header>

            <NotificationDrawer
                notifications={notifications}
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                onMarkRead={handleMarkRead}
                navigate={navigate}
            />

            <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">

                {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
                {actionStatus && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center justify-between">
                        {actionStatus}
                        <button onClick={() => setActionStatus('')} className="text-amber-400 hover:text-amber-600 ml-2"><X size={14} /></button>
                    </div>
                )}

                {/* KPI cards */}
                <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                    {[
                        { label: 'Total Clients', value: loading ? '…' : clients.length, icon: <Users size={18} />, accent: 'border-l-[#1D6FDB]', color: 'text-[#1D6FDB]', to: null },
                        { label: 'AUM Book', value: loading ? '…' : fmt.inr(totalAum), icon: <BarChart3 size={18} />, accent: 'border-l-emerald-500', color: 'text-emerald-700', to: null },
                        { label: 'Open Attention', value: loading ? '…' : attentionCount, icon: <ListTodo size={18} />, accent: 'border-l-amber-500', color: 'text-amber-700', to: null },
                        { label: 'Unread Alerts', value: loading ? '…' : unreadCount, icon: <BellRing size={18} />, accent: 'border-l-rose-500', color: 'text-rose-700', to: null },
                        { label: 'Open Opps', value: loading || openOpps === null ? '…' : openOpps, icon: <Database size={18} />, accent: 'border-l-violet-500', color: 'text-violet-700', to: '/opportunities' },
                        { label: 'Tasks Due 7d', value: loading || tasksDue7d === null ? '…' : tasksDue7d, icon: <Sparkles size={18} />, accent: 'border-l-cyan-500', color: 'text-cyan-700', to: '/tasks' },
                    ].map(({ label, value, icon, accent, color, to }) => (
                        to ? (
                            <Link key={label} to={to} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-l-4 ${accent} hover:shadow-md transition-shadow`}>
                                <div className="text-xs text-gray-500 mb-1">{label}</div>
                                <div className={`text-2xl font-bold mt-1 flex items-center gap-2 ${color}`}>{icon}{value}</div>
                            </Link>
                        ) : (
                            <div key={label} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-l-4 ${accent}`}>
                                <div className="text-xs text-gray-500 mb-1">{label}</div>
                                <div className={`text-2xl font-bold mt-1 flex items-center gap-2 ${color}`}>{icon}{value}</div>
                            </div>
                        )
                    ))}
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-8 space-y-4">
                        {/* Workflow Pipeline */}
                        <div className={CARD}>
                            <div className="flex items-center gap-2 mb-3">
                                <Layers3 size={16} className="text-gray-500" />
                                <h2 className="text-sm font-semibold text-gray-800">Workflow Pipeline</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {pipeline.map(item => (
                                    <div key={item.stage} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                                        <div className="text-xs text-gray-500">{item.stage}</div>
                                        <div className={`mt-1 inline-flex px-2 py-1 rounded-full text-sm font-semibold ${item.tone}`}>{item.count}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Priority Client Queue */}
                        <div className={CARD}>
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={16} className="text-gray-500" />
                                <h2 className="text-sm font-semibold text-gray-800">Priority Client Queue</h2>
                            </div>
                            <div className="mb-3">
                                <label className="text-xs text-gray-500 mr-2">Selected client:</label>
                                <select
                                    className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                                    value={selectedClientId || ''}
                                    onChange={e => setSelectedClientId(Number(e.target.value))}
                                >
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                {focusClients.map(c => (
                                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                                            <div className="text-xs text-gray-500">AUM {fmt.inr(c.total_value || 0)} · Risk {Number(c.risk_score || 0)}/10</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${Number(c.urgency_score || 0) > 0 ? 'text-amber-700 bg-amber-100' : 'text-emerald-700 bg-emerald-100'}`}>
                                                {Number(c.urgency_score || 0) > 0 ? 'Needs attention' : 'On track'}
                                            </span>
                                            <Link to={`/clients/${c.id}`} className="text-gray-400 hover:text-[#1D6FDB]"><ChevronRight size={14} /></Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* All Clients table */}
                        <div className={CARD}>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold text-gray-800">All Clients</h2>
                                <span className="text-xs text-gray-500">{filteredClients.length} / {clients.length}</span>
                            </div>

                            {/* Search + filter */}
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    placeholder="Search by name…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                                />
                                <select
                                    value={segmentFilter}
                                    onChange={e => setSegmentFilter(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                                >
                                    <option value="All">All</option>
                                    <option value="HNI">HNI</option>
                                    <option value="Retail">Retail</option>
                                </select>
                            </div>

                            {clients.length === 0 ? (
                                <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-3">
                                    No clients returned. Verify advisor session and API connectivity.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-100">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50 border-b border-gray-100">
                                            <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                <th className="px-4 py-3">Client</th>
                                                <th className="px-4 py-3">Segment</th>
                                                <th className="px-4 py-3">AUM</th>
                                                <th className="px-4 py-3">Urgency</th>
                                                <th className="px-4 py-3">Open</th>
                                                <th className="px-4 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredClients.map(c => (
                                                <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${delinkConfirm === c.id ? 'bg-amber-50' : ''}`}>
                                                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                                                    <td className="px-4 py-3 text-gray-600">{c.segment || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-700">{fmt.inr(c.total_value || 0)}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${Number(c.urgency_score || 0) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {Number(c.urgency_score || 0) > 0 ? 'Needs attention' : 'On track'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Link to={`/clients/${c.id}`} className="text-xs font-semibold px-2 py-1 rounded-lg bg-blue-50 text-[#1D6FDB] hover:bg-blue-100 transition-colors">
                                                            Client360
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {delinkConfirm === c.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-amber-700 font-medium">Confirm delink?</span>
                                                                <button onClick={() => handleDelink(c.id)} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg transition-colors">Yes</button>
                                                                <button onClick={() => setDelinkConfirm(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setDelinkConfirm(c.id)}
                                                                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                                title="Delink client"
                                                            >
                                                                <UserMinus size={14} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Backend Endpoints */}
                        <div className={CARD}>
                            <div className="flex items-center gap-2 mb-3">
                                <Database size={16} className="text-gray-500" />
                                <h2 className="text-sm font-semibold text-gray-800">Backend Endpoints</h2>
                            </div>
                            <div className="space-y-2">
                                {[
                                    { label: 'Open add client flow', hint: 'POST /clients', link: '/clients/new' },
                                    { label: 'Open selected client 360', hint: 'GET /clients/:id', link: selectedClientId ? `/clients/${selectedClientId}` : null },
                                    { label: 'Meeting prep loaded', hint: 'GET /clients/:id/meeting-prep', ok: Boolean(selectedData.meetingPrep) },
                                    { label: 'Interactions loaded', hint: 'GET /clients/:id/interactions', ok: Array.isArray(selectedData.interactions) },
                                    { label: 'Trades loaded', hint: 'GET /trades/clients/:id/trades', ok: Array.isArray(selectedData.trades) },
                                ].map((ep, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 bg-white">
                                        <div>
                                            <div className="text-sm font-medium text-gray-800">{ep.label}</div>
                                            <div className="text-xs text-gray-500">{ep.hint}</div>
                                        </div>
                                        {ep.link ? (
                                            <Link to={ep.link} className="text-xs font-semibold px-2 py-1 rounded-lg bg-blue-50 text-[#1D6FDB] hover:bg-blue-100">Open</Link>
                                        ) : ep.ok ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700"><CheckCircle2 size={12} />Loaded</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-gray-100 text-gray-600">Unavailable</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="xl:col-span-4 space-y-4">
                        <div className={CARD}>
                            <div className="flex items-center gap-2 mb-2"><CalendarClock size={16} className="text-gray-500" /><h3 className="text-sm font-semibold text-gray-800">Today</h3></div>
                            <div className="text-sm text-gray-700 mb-2">{todayDate}</div>
                            <div className="text-xs text-gray-500">Briefing points: {Array.isArray(briefing?.priorities) ? briefing.priorities.length : 0}</div>
                            {Array.isArray(briefing?.priorities) && briefing.priorities.slice(0, 3).map((p, i) => (
                                <div key={i} className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{p}</div>
                            ))}
                        </div>

                        <div className={CARD}>
                            <div className="flex items-center gap-2 mb-2"><CheckCircle size={16} className="text-gray-500" /><h3 className="text-sm font-semibold text-gray-800">Advisor Actions</h3></div>
                            <div className="space-y-2">
                                <button
                                    onClick={async () => { try { setBriefing(await getBriefing(advisorUsername)); setActionStatus('Briefing refreshed') } catch { setActionStatus('Briefing unavailable') } }}
                                    className="w-full text-left px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Run morning briefing
                                </button>
                                <button
                                    onClick={fetchNotifications}
                                    className="w-full text-left px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Refresh notifications
                                </button>
                                {['Open all pending approvals', 'View risk exceptions', 'Integration health'].map(label => (
                                    <button key={label} disabled className="w-full text-left px-3 py-2 rounded-xl border border-rose-200 text-sm font-medium text-rose-600 bg-rose-50 cursor-not-allowed opacity-70">
                                        {label} (no endpoint)
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={CARD}>
                            <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className="text-gray-500" /><h3 className="text-sm font-semibold text-gray-800">Selected Client Snapshot</h3></div>
                            <div className="space-y-1 text-sm text-gray-700">
                                <div>Goals: <span className="font-semibold">{selectedData.goals.length}</span></div>
                                <div>Interactions: <span className="font-semibold">{selectedData.interactions.length}</span></div>
                                <div>Trades: <span className="font-semibold">{selectedData.trades.length}</span></div>
                                <div>Meeting Prep: <span className="font-semibold">{selectedData.meetingPrep ? 'Loaded' : 'Not loaded'}</span></div>
                            </div>
                            {!selectedClientId && (
                                <div className="mt-2 inline-flex items-center gap-1 text-xs text-rose-700 bg-rose-50 px-2 py-1 rounded-lg">
                                    <XCircle size={12} /> Select a client above.
                                </div>
                            )}
                        </div>
                    </aside>
                </section>
            </div>
        </div>
    )
}
