import { useMemo } from 'react'

import type { DashboardSummary, ProjectRecord, RfiRecord, SubmittalRecord } from '../../types/workspace'

type DashboardPanelProps = {
  summary: DashboardSummary
  projects: ProjectRecord[]
  submittals: SubmittalRecord[]
  rfis: RfiRecord[]
}

const safePercent = (value: number, total: number): number => {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)))
}

const isoToday = () => new Date().toISOString().slice(0, 10)

function buildLinePath(values: number[]): string {
  if (values.length === 0) return ''
  const max = Math.max(...values, 1)
  const stepX = values.length > 1 ? 100 / (values.length - 1) : 100
  return values
    .map((value, index) => {
      const x = index * stepX
      const y = 100 - (value / max) * 85
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}

function normalizeProjectStatus(value: string | null): 'preliminary' | 'construction' | 'completed' | 'other' {
  const text = String(value || '').toLowerCase()
  if (text.includes('prelim')) return 'preliminary'
  if (text.includes('construct')) return 'construction'
  if (text.includes('finish') || text.includes('completion') || text.includes('complete')) return 'completed'
  return 'other'
}

function normalizePriority(value: string | null): 'high' | 'medium' | 'low' | 'other' {
  const text = String(value || '').toLowerCase()
  if (text === 'high') return 'high'
  if (text === 'medium') return 'medium'
  if (text === 'low') return 'low'
  return 'other'
}

export default function DashboardPanel({ summary, projects, submittals, rfis }: DashboardPanelProps) {
  const totalProjects = Math.max(projects.length, summary.active_projects)
  const pressureCases = summary.submittals_late + summary.rfis_overdue_open
  const deliveryFlow = useMemo(
    () => [summary.active_projects, summary.submittals_open, summary.submittals_late, summary.rfis_open, summary.rfis_overdue_open],
    [summary]
  )
  const deliveryPath = useMemo(() => buildLinePath(deliveryFlow), [deliveryFlow])
  const currentDate = isoToday()

  const projectPhase = useMemo(() => {
    const counters = { preliminary: 0, construction: 0, completed: 0, other: 0 }
    projects.forEach((project) => { counters[normalizeProjectStatus(project.status)] += 1 })
    return counters
  }, [projects])

  const priorityLoad = useMemo(() => {
    const counters = { high: 0, medium: 0, low: 0, other: 0 }
    projects.forEach((project) => { counters[normalizePriority(project.priority)] += 1 })
    return counters
  }, [projects])

  const submittalsDueSoon = useMemo(
    () => submittals.filter((item) => item.due_date && item.due_date >= currentDate).length,
    [submittals, currentDate]
  )
  const rfisDueSoon = useMemo(
    () => rfis.filter((item) => item.response_due && item.response_due >= currentDate).length,
    [rfis, currentDate]
  )

  const cards = [
    {
      label: 'Active Projects',
      value: summary.active_projects,
      tone: 'from-[#1f4e79] to-[#2a6fa7]',
      chip: `${safePercent(summary.active_projects, totalProjects || 1)}% portfolio`,
    },
    {
      label: 'Open Submittals',
      value: summary.submittals_open,
      tone: 'from-[#106c6f] to-[#21a38f]',
      chip: `${summary.submittals_late} late`,
    },
    {
      label: 'Open RFIs',
      value: summary.rfis_open,
      tone: 'from-[#8b5a14] to-[#d79d2b]',
      chip: `${summary.rfis_overdue_open} overdue`,
    },
    {
      label: 'Critical Attention',
      value: pressureCases,
      tone: 'from-[#8d2648] to-[#c44766]',
      chip: pressureCases === 0 ? 'All clear' : 'Needs follow-up',
    },
  ] as const

  return (
    <section className="mt-6 space-y-5">
      <div className="rounded-3xl border border-[#d8e2ef] bg-[linear-gradient(140deg,#ffffff_0%,#f4f8fd_100%)] p-6 shadow-soft">
        <div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4b6a87]">Executive Dashboard</p>
            <h2 className="mt-2 text-3xl font-semibold text-[#1d3551]">Program Performance Snapshot</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className={`rounded-2xl bg-gradient-to-br ${card.tone} p-[1px] shadow-sm`}>
              <div className="rounded-2xl bg-white/95 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5a7896]">{card.label}</p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-3xl font-bold text-[#1c3450]">{card.value}</span>
                  <span className="rounded-full bg-[#eef4fb] px-2 py-1 text-[11px] font-semibold text-[#436486]">{card.chip}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <article className="rounded-3xl border border-[#d7e2ef] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-[#1d3551]">Delivery Flow</h3>
            <span className="rounded-full bg-[#edf3fb] px-3 py-1 text-xs font-semibold text-[#436486]">Projects to Submittals to RFIs</span>
          </div>
          <div className="mt-4 rounded-2xl border border-[#e5edf7] bg-[#f9fcff] p-4">
            <svg viewBox="0 0 100 100" className="h-44 w-full">
              <defs>
                <linearGradient id="dashboardLine" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1f4e79" />
                  <stop offset="60%" stopColor="#20a39e" />
                  <stop offset="100%" stopColor="#d79d2b" />
                </linearGradient>
              </defs>
              <path d={deliveryPath} fill="none" stroke="url(#dashboardLine)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#4f6982] md:grid-cols-5">
              <span>Active: {summary.active_projects}</span>
              <span>Subm Open: {summary.submittals_open}</span>
              <span>Subm Late: {summary.submittals_late}</span>
              <span>RFI Open: {summary.rfis_open}</span>
              <span>RFI Overdue: {summary.rfis_overdue_open}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[#e2ebf6] bg-[#f7fbff] p-4">
              <p className="text-sm font-semibold text-[#2a4969]">Upcoming Deadlines</p>
              <p className="mt-2 text-3xl font-bold text-[#1d3551]">{submittalsDueSoon + rfisDueSoon}</p>
              <p className="text-xs text-[#577490]">Submittals due: {submittalsDueSoon} | RFIs due: {rfisDueSoon}</p>
            </div>
            <div className="rounded-2xl border border-[#f2e2c4] bg-[#fff9ee] p-4">
              <p className="text-sm font-semibold text-[#7d5a22]">Overdue Pressure</p>
              <p className="mt-2 text-3xl font-bold text-[#7d3a2c]">{pressureCases}</p>
              <p className="text-xs text-[#8b6542]">Late submittals + overdue RFIs</p>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-[#d7e2ef] bg-white p-5 shadow-sm">
          <h3 className="text-xl font-semibold text-[#1d3551]">Project Distribution</h3>

          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[#436486]">
                <span>Preliminary</span>
                <span>{projectPhase.preliminary}</span>
              </div>
              <div className="h-2 rounded-full bg-[#e9f0f8]">
                <div className="h-2 rounded-full bg-[#76a4d4]" style={{ width: `${safePercent(projectPhase.preliminary, totalProjects)}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[#436486]">
                <span>Under Construction</span>
                <span>{projectPhase.construction}</span>
              </div>
              <div className="h-2 rounded-full bg-[#e9f0f8]">
                <div className="h-2 rounded-full bg-[#20a39e]" style={{ width: `${safePercent(projectPhase.construction, totalProjects)}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[#436486]">
                <span>Completed</span>
                <span>{projectPhase.completed}</span>
              </div>
              <div className="h-2 rounded-full bg-[#e9f0f8]">
                <div className="h-2 rounded-full bg-[#4a8f55]" style={{ width: `${safePercent(projectPhase.completed, totalProjects)}%` }} />
              </div>
            </div>
          </div>

          <h4 className="mt-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#4f6982]">Priority Mix</h4>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-[#f3d4dc] bg-[#fff2f6] px-3 py-2">
              <span className="font-semibold text-[#8d2648]">High</span>
              <span className="font-bold text-[#8d2648]">{priorityLoad.high}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#f4e5c8] bg-[#fff8eb] px-3 py-2">
              <span className="font-semibold text-[#8b5a14]">Medium</span>
              <span className="font-bold text-[#8b5a14]">{priorityLoad.medium}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#dcebd9] bg-[#f3fbf0] px-3 py-2">
              <span className="font-semibold text-[#35693d]">Low</span>
              <span className="font-bold text-[#35693d]">{priorityLoad.low}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
