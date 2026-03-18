import { fmt } from '../api/client'

const CATEGORY_COLORS = {
  'Large Cap':     'bg-blue-50 text-blue-700 border-blue-100',
  'Flexi Cap':     'bg-violet-50 text-violet-700 border-violet-100',
  'Small Cap':     'bg-rose-50 text-rose-700 border-rose-100',
  'Mid Cap':       'bg-orange-50 text-orange-700 border-orange-100',
  'Corporate Bond':'bg-teal-50 text-teal-700 border-teal-100',
  'Liquid':        'bg-gray-100 text-gray-600 border-gray-200',
  'ELSS':          'bg-emerald-50 text-emerald-700 border-emerald-100',
}

function AllocationBar({ current, target }) {
  const drift = current - target
  const absDrift = Math.abs(drift)
  const isDrifted = absDrift > 2
  const barColor = isDrifted ? (drift > 0 ? 'bg-red-400' : 'bg-green-400') : 'bg-navy-400'

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(current, 100)}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums w-8 text-right ${
        isDrifted ? (drift > 0 ? 'text-red-600' : 'text-green-600') : 'text-gray-700'
      }`}>
        {current.toFixed(1)}%
      </span>
    </div>
  )
}

export default function HoldingsTable({ holdings }) {
  if (!holdings || holdings.length === 0) {
    return <div className="text-sm text-gray-400 py-6 text-center">No holdings data</div>
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0)

  return (
    <div className="space-y-2">
      {holdings.map(h => {
        const drift = h.current_pct - h.target_pct
        const absDrift = Math.abs(drift)
        const isDrifted = absDrift > 2
        const catColor = CATEGORY_COLORS[h.fund_category] || 'bg-gray-100 text-gray-600 border-gray-200'

        return (
          <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all">
            {/* Fund info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-900 leading-tight truncate">{h.fund_name}</span>
                {isDrifted && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    drift > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {drift > 0 ? `+${drift.toFixed(1)}%` : `${drift.toFixed(1)}%`} drift
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">{h.fund_house}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${catColor}`}>
                  {h.fund_category}
                </span>
              </div>
            </div>

            {/* Value */}
            <div className="text-right flex-shrink-0">
              <div className="text-xs font-bold text-gray-900">{fmt.inr(h.current_value)}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {totalValue > 0 ? ((h.current_value / totalValue) * 100).toFixed(1) : 0}% of portfolio
              </div>
            </div>

            {/* Allocation bar — hidden on very small screens */}
            <div className="hidden sm:block w-28 flex-shrink-0">
              <AllocationBar current={h.current_pct} target={h.target_pct} />
              <div className="text-xs text-gray-400 mt-0.5 text-right">target {h.target_pct}%</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
