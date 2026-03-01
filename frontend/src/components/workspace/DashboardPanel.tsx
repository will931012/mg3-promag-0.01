import type { DashboardSummary } from '../../types/workspace'

type DashboardPanelProps = {
  summary: DashboardSummary
}

export default function DashboardPanel({ summary }: DashboardPanelProps) {
  const rows = [
    ['Active Projects', summary.active_projects],
    ['Submittals OPEN', summary.submittals_open],
    ['Submittals LATE', summary.submittals_late],
    ['RFIs OPEN', summary.rfis_open],
    ['RFIs Overdue (Open)', summary.rfis_overdue_open],
  ] as const

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">PERSONAL CONSTRUCTION TRACKER</h2>
      <div className="mt-6 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <span className="text-lg font-semibold text-slate-800">{label}</span>
            <span className="min-w-8 text-right text-2xl font-bold text-slate-900">{value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
