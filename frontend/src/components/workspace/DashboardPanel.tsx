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
    <section className="space-y-3 text-[#d9e2ff]">
      <div className="rounded-xl border border-white/5 bg-[#1b2035] p-4">
        <p className="text-xs text-[#8f98bf]">Today's Sales</p>
        <h2 className="text-lg font-semibold text-[#f0f4ff]">Sales Summary</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-lg border border-white/5 bg-[#111628] p-3">
              <p className="text-xs text-[#8f98bf]">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-[#f2f7ff]">{card.value}</p>
              <p className="text-[11px] text-[#5be1c7]">{card.chip}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-xl border border-white/5 bg-[#1b2035] p-4">
          <h3 className="text-lg font-semibold text-[#f0f4ff]">Delivery Flow</h3>
          <div className="mt-3 rounded-lg border border-white/5 bg-[#12172a] p-3">
            <svg viewBox="0 0 100 100" className="h-40 w-full">
              <defs>
                <linearGradient id="dashboardLine" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6aead0" />
                  <stop offset="100%" stopColor="#8ba6ff" />
                </linearGradient>
              </defs>
              <path d={deliveryPath} fill="none" stroke="url(#dashboardLine)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#97a0c4] md:grid-cols-5">
              <span>Active: {summary.active_projects}</span>
              <span>Subm Open: {summary.submittals_open}</span>
              <span>Subm Late: {summary.submittals_late}</span>
              <span>RFI Open: {summary.rfis_open}</span>
              <span>RFI Overdue: {summary.rfis_overdue_open}</span>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-white/5 bg-[#12172a] p-3">
              <p className="text-xs text-[#8f98bf]">Upcoming Deadlines</p>
              <p className="text-2xl font-bold text-[#f0f4ff]">{submittalsDueSoon + rfisDueSoon}</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-[#12172a] p-3">
              <p className="text-xs text-[#8f98bf]">Overdue Pressure</p>
              <p className="text-2xl font-bold text-[#f0f4ff]">{pressureCases}</p>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-white/5 bg-[#1b2035] p-4">
          <h3 className="text-lg font-semibold text-[#f0f4ff]">Project Distribution</h3>
          <div className="mt-3 space-y-3 text-xs">
            <div>
              <div className="mb-1 flex justify-between text-[#97a0c4]"><span>Preliminary</span><span>{projectPhase.preliminary}</span></div>
              <div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-[#95f2df]" style={{ width: `${safePercent(projectPhase.preliminary, totalProjects)}%` }} /></div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[#97a0c4]"><span>Construction</span><span>{projectPhase.construction}</span></div>
              <div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-[#8ba6ff]" style={{ width: `${safePercent(projectPhase.construction, totalProjects)}%` }} /></div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[#97a0c4]"><span>Completed</span><span>{projectPhase.completed}</span></div>
              <div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-[#ffd072]" style={{ width: `${safePercent(projectPhase.completed, totalProjects)}%` }} /></div>
            </div>
          </div>
          <h4 className="mt-5 text-xs uppercase tracking-[0.12em] text-[#8f98bf]">Priority Mix</h4>
          <div className="mt-2 grid gap-2 text-sm">
            <div className="flex items-center justify-between rounded-md bg-[#12172a] px-3 py-2"><span>High</span><span>{priorityLoad.high}</span></div>
            <div className="flex items-center justify-between rounded-md bg-[#12172a] px-3 py-2"><span>Medium</span><span>{priorityLoad.medium}</span></div>
            <div className="flex items-center justify-between rounded-md bg-[#12172a] px-3 py-2"><span>Low</span><span>{priorityLoad.low}</span></div>
          </div>
        </article>
      </div>
    </section>
  )
}
