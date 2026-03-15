import { useMemo, useState } from 'react'
import { fmt, getGoalProjection } from '../api/client'
import { Target, AlertCircle } from 'lucide-react'

function ProbabilityBar({ pct }) {
  const color = pct >= 80 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'
  const textColor = pct >= 80 ? 'text-green-700' : pct >= 70 ? 'text-amber-700' : 'text-red-700'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">Probability</span>
        <span className={`font-semibold ${textColor}`}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function sipStatus(lastSipDate) {
  if (!lastSipDate) return { label: 'No SIP recorded', color: 'text-gray-400' }
  const days = Math.floor((Date.now() - new Date(lastSipDate)) / 86400000)
  if (days > 35) return { label: `SIP missed — ${days}d ago`, color: 'text-red-600' }
  if (days > 25) return { label: `SIP ${days}d ago`, color: 'text-amber-600' }
  return { label: `SIP ${days}d ago`, color: 'text-green-600' }
}

function SliderControl({ label, min, max, step, value, onChange, displayValue, hint }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-gray-800">{label}</div>
          {hint && <div className="text-xs text-gray-500 mt-0.5">{hint}</div>}
        </div>
        <div className="text-sm font-semibold text-navy-950 whitespace-nowrap">{displayValue}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-navy-950"
      />
    </div>
  )
}

function ProjectionDelta({ base, projected }) {
  const delta = projected - base
  const color = delta >= 0 ? 'text-green-700' : 'text-red-700'
  const sign = delta >= 0 ? '+' : ''

  return (
    <div className="text-xs">
      <span className="text-gray-500">Scenario: </span>
      <span className={`font-semibold ${color}`}>{projected.toFixed(1)}%</span>
      <span className={`ml-1 ${color}`}>({sign}{delta.toFixed(1)}pts)</span>
    </div>
  )
}

export default function GoalsPanel({ clientId, goals }) {
  const [sipDelta, setSipDelta] = useState(0)
  const [returnRate, setReturnRate] = useState(12)
  const [yearsDelta, setYearsDelta] = useState(0)
  const [projections, setProjections] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!goals || goals.length === 0) {
    return <div className="text-sm text-gray-400 py-4 text-center">No goals on record</div>
  }

  const hasActiveScenario = sipDelta !== 0 || returnRate !== 12 || yearsDelta !== 0

  const projectionMap = useMemo(
    () => Object.fromEntries(projections.map((projection) => [projection.goal_id, projection])),
    [projections]
  )

  const runScenario = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getGoalProjection(clientId, {
        sip_delta: sipDelta,
        return_rate: returnRate / 100,
        years_delta: yearsDelta,
      })
      setProjections(data)
    } catch {
      setError('Unable to run what-if scenario right now.')
    } finally {
      setLoading(false)
    }
  }

  const resetScenario = () => {
    setSipDelta(0)
    setReturnRate(12)
    setYearsDelta(0)
    setProjections([])
    setError(null)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-semibold text-gray-900">What-if scenario</div>
            <div className="text-xs text-gray-500 mt-1">
              Adjust SIP, return, and timeline to preview how goal probabilities could change.
            </div>
          </div>
          {hasActiveScenario && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-navy-100 text-navy-700">
              Scenario modified
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SliderControl
            label="Monthly SIP delta"
            min={-50000}
            max={50000}
            step={5000}
            value={sipDelta}
            onChange={setSipDelta}
            displayValue={`${sipDelta > 0 ? '+' : ''}${fmt.inr(sipDelta)}`}
            hint="Range: ±₹50k per month"
          />

          <SliderControl
            label="Assumed return"
            min={6}
            max={18}
            step={1}
            value={returnRate}
            onChange={setReturnRate}
            displayValue={`${returnRate}%`}
            hint="Range: 6% to 18% annual"
          />

          <SliderControl
            label="Timeline shift"
            min={-2}
            max={5}
            step={1}
            value={yearsDelta}
            onChange={setYearsDelta}
            displayValue={`${yearsDelta > 0 ? '+' : ''}${yearsDelta}y`}
            hint="Range: -2 to +5 years"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={runScenario}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-navy-950 text-white text-sm font-medium hover:bg-navy-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Running scenario…' : 'Run scenario'}
          </button>
          <button
            onClick={resetScenario}
            disabled={loading && !hasActiveScenario}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          <div className="text-xs text-gray-500">
            Live recalculation will be added in the next step.
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {goals.map(g => {
        const sip = sipStatus(g.last_sip_date)
        const daysToTarget = Math.floor((new Date(g.target_date) - Date.now()) / 86400000)
        const yearsToTarget = (daysToTarget / 365).toFixed(1)
        const urgent = g.probability_pct < 70
        const projection = projectionMap[g.id]
        const scenarioDate = projection
          ? new Date(projection.target_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
          : null

        return (
          <div key={g.id} className={`p-4 rounded-xl border ${urgent ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {urgent
                  ? <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  : <Target size={14} className="text-navy-600 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{g.goal_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Target: {fmt.inr(g.target_amount)} in {yearsToTarget}y
                    ({new Date(g.target_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })})
                  </div>
                </div>
              </div>
            </div>

            <ProbabilityBar pct={g.probability_pct} />

            {projection && (
              <div className="mt-3 p-3 rounded-lg bg-navy-50 border border-navy-100 space-y-2">
                <ProjectionDelta
                  base={projection.base_probability_pct}
                  projected={projection.projected_probability_pct}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Scenario SIP: </span>
                    <span className="font-medium text-gray-900">{fmt.inr(projection.monthly_sip)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Scenario return: </span>
                    <span className="font-medium text-gray-900">{(projection.assumed_return_rate * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Scenario target: </span>
                    <span className="font-medium text-gray-900">{scenarioDate}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-xs">
              <div className="text-gray-500">
                Monthly SIP: <span className="font-medium text-gray-800">{fmt.inr(g.monthly_sip)}</span>
              </div>
              <div className={`font-medium ${sip.color}`}>{sip.label}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
