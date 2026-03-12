import { useMemo } from 'react'

import EmptyState from '../common/EmptyState'
import StatusBadge from '../common/StatusBadge'
import type { DashboardSummary, ProjectRecord, RfiRecord, SubmittalRecord } from '../../types/workspace'

type DashboardPanelProps = {
  summary: DashboardSummary
  projects: ProjectRecord[]
  submittals: SubmittalRecord[]
  rfis: RfiRecord[]
  onNavigate: (path: string) => void
}

const safePercent = (value: number, total: number): number => {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)))
}

const isoToday = () => new Date().toISOString().slice(0, 10)
const addDays = (dateIso: string, days: number) => {
  const value = new Date(`${dateIso}T00:00:00`)
  value.setDate(value.getDate() + days)
  return value.toISOString().slice(0, 10)
}

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

function isClosedSubmittal(item: SubmittalRecord): boolean {
  const lifecycle = String(item.lifecycle_status || '').toLowerCase()
  if (lifecycle === 'closed') return true
  const status = String(item.overall_status || item.approval_status || '').toLowerCase()
  return status.includes('approved') || status.includes('closed') || status.includes('complete')
}

function isClosedRfi(item: RfiRecord): boolean {
  const lifecycle = String(item.lifecycle_status || '').toLowerCase()
  if (lifecycle === 'closed') return true
  const status = String(item.status || '').toLowerCase()
  return status.includes('approved') || status.includes('closed') || status.includes('answered') || status.includes('complete')
}

export default function DashboardPanel({ summary, projects, submittals, rfis, onNavigate }: DashboardPanelProps) {
  const totalProjects = Math.max(projects.length, summary.active_projects)
  const pressureCases = summary.submittals_late + summary.rfis_overdue_open
  const deliveryFlow = useMemo(
    () => [summary.active_projects, summary.submittals_open, summary.submittals_late, summary.rfis_open, summary.rfis_overdue_open],
    [summary]
  )
  const deliveryPath = useMemo(() => buildLinePath(deliveryFlow), [deliveryFlow])
  const currentDate = isoToday()
  const nextWeekDate = addDays(currentDate, 7)

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
    () => submittals.filter((item) => item.due_date && item.due_date >= currentDate && item.due_date <= nextWeekDate && !isClosedSubmittal(item)).length,
    [submittals, currentDate, nextWeekDate]
  )
  const rfisDueSoon = useMemo(
    () => rfis.filter((item) => item.response_due && item.response_due >= currentDate && item.response_due <= nextWeekDate && !isClosedRfi(item)).length,
    [rfis, currentDate, nextWeekDate]
  )
  const dueTodayCount = useMemo(
    () =>
      submittals.filter((item) => item.due_date === currentDate && !isClosedSubmittal(item)).length +
      rfis.filter((item) => item.response_due === currentDate && !isClosedRfi(item)).length,
    [currentDate, submittals, rfis]
  )
  const overdueCount = useMemo(
    () =>
      submittals.filter((item) => item.due_date && item.due_date < currentDate && !isClosedSubmittal(item)).length +
      rfis.filter((item) => item.response_due && item.response_due < currentDate && !isClosedRfi(item)).length,
    [currentDate, submittals, rfis]
  )
  const quickActions = [
    { label: 'New Project', detail: 'Set up a new job', path: '/projects' },
    { label: 'Log Submittal', detail: 'Register a review item', path: '/submittals' },
    { label: 'Log RFI', detail: 'Track field questions', path: '/rfis' },
    { label: 'Review Risks', detail: 'Open late items', path: '/dashboard' },
  ] as const

  const cards = [
    {
      label: 'Active Projects',
      value: summary.active_projects,
      chip: `${safePercent(summary.active_projects, totalProjects || 1)}% of portfolio`,
    },
    {
      label: 'Open Submittals',
      value: summary.submittals_open,
      chip: `${summary.submittals_late} late in review`,
    },
    {
      label: 'Open RFIs',
      value: summary.rfis_open,
      chip: `${summary.rfis_overdue_open} overdue response`,
    },
    {
      label: 'Field Pressure',
      value: pressureCases,
      chip: pressureCases === 0 ? 'No blockers today' : 'Needs follow-up',
    },
  ] as const
  const urgentSubmittals = useMemo(
    () => submittals.filter((item) => item.project_id).slice(0, 3),
    [submittals]
  )
  const urgentRfis = useMemo(
    () => rfis.filter((item) => item.project_id).slice(0, 3),
    [rfis]
  )
  const topProjects = useMemo(() => projects.slice(0, 3), [projects])
  const attentionItems = useMemo(
    () => [
      ...submittals
        .filter((item) => item.project_id && item.due_date && item.due_date < currentDate && !isClosedSubmittal(item))
        .map((item) => ({
          id: `submittal-${item.id}`,
          type: 'Submittal',
          title: item.submittal_number || `Submittal ${item.id}`,
          meta: item.subject || 'Pending review',
          path: `/projects/${encodeURIComponent(String(item.project_id))}/submittals/${item.id}`,
        })),
      ...rfis
        .filter((item) => item.project_id && item.response_due && item.response_due < currentDate && !isClosedRfi(item))
        .map((item) => ({
          id: `rfi-${item.id}`,
          type: 'RFI',
          title: item.rfi_number || `RFI ${item.id}`,
          meta: item.subject || 'Pending response',
          path: `/projects/${encodeURIComponent(String(item.project_id))}/rfis/${item.id}`,
        })),
    ].slice(0, 4),
    [submittals, rfis, currentDate]
  )
  const recentActivity = useMemo(
    () =>
      [
        ...submittals
          .filter((item) => item.project_id)
          .map((item) => ({
            id: `submittal-${item.id}`,
            kind: 'Submittal',
            title: item.submittal_number || `Submittal ${item.id}`,
            subtitle: item.subject || item.project_id || 'No subject',
            path: `/projects/${encodeURIComponent(String(item.project_id))}/submittals/${item.id}`,
            order: item.id,
          })),
        ...rfis
          .filter((item) => item.project_id)
          .map((item) => ({
            id: `rfi-${item.id}`,
            kind: 'RFI',
            title: item.rfi_number || `RFI ${item.id}`,
            subtitle: item.subject || item.project_id || 'No subject',
            path: `/projects/${encodeURIComponent(String(item.project_id))}/rfis/${item.id}`,
            order: item.id,
          })),
      ]
        .sort((a, b) => b.order - a.order)
        .slice(0, 5),
    [submittals, rfis]
  )
  const projectHealth = useMemo(() => {
    const projectMap = new Map<string, { name: string; openSubmittals: number; openRfis: number; late: number }>()
    projects.forEach((project) => {
      projectMap.set(project.project_id, { name: project.project_name, openSubmittals: 0, openRfis: 0, late: 0 })
    })
    submittals.forEach((item) => {
      if (!item.project_id || !projectMap.has(item.project_id) || isClosedSubmittal(item)) return
      const entry = projectMap.get(item.project_id)
      if (!entry) return
      entry.openSubmittals += 1
      if (item.due_date && item.due_date < currentDate) entry.late += 1
    })
    rfis.forEach((item) => {
      if (!item.project_id || !projectMap.has(item.project_id) || isClosedRfi(item)) return
      const entry = projectMap.get(item.project_id)
      if (!entry) return
      entry.openRfis += 1
      if (item.response_due && item.response_due < currentDate) entry.late += 1
    })
    return Array.from(projectMap.entries())
      .map(([projectId, value]) => ({
        projectId,
        ...value,
        load: value.openSubmittals + value.openRfis + value.late * 2,
      }))
      .sort((a, b) => b.load - a.load)
      .slice(0, 4)
  }, [projects, submittals, rfis, currentDate])

  return (
    <section className="space-y-3 text-[#d9e2ff]">
      <div className="slide-in rounded-xl border border-white/10 bg-[#1b2035] p-4" style={{ animationDelay: '0ms' }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8f98bf]">Construction Control</p>
            <h2 className="text-xl font-semibold text-[#f0f4ff]">Project Operations Snapshot</h2>
            <p className="mt-1 text-sm text-[#9ea8cd]">Monitor project load, review flow and field response pressure from one place.</p>
          </div>
          <div className="grid min-w-[240px] gap-2 sm:grid-cols-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => onNavigate(action.path)}
                className="rounded-xl border border-[#314067] bg-[#111628] px-3 py-2 text-left transition hover:border-[#8ba6ff] hover:bg-[#171d34]"
              >
                <p className="text-sm font-semibold text-[#edf2ff]">{action.label}</p>
                <p className="text-xs text-[#8f98bf]">{action.detail}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card, index) => {
            const to =
              card.label === 'Active Projects'
                ? '/projects'
                : card.label.includes('Submittals')
                  ? '/submittals'
                  : card.label.includes('RFIs')
                    ? '/rfis'
                    : '/dashboard'
            return (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigate(to)}
              className="slide-in rounded-lg border border-white/10 bg-[#111628] p-3 text-left transition hover:border-[#5be1c7]/60 hover:bg-[#171d34]"
              style={{ animationDelay: `${60 + (index * 45)}ms` }}
            >
              <p className="text-xs font-semibold tracking-[0.06em] text-[#8f98bf]">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-[#f2f7ff]">{card.value}</p>
              <div className="mt-1">
                <StatusBadge label={card.chip} tone={card.label === 'Field Pressure' ? 'warning' : 'info'} />
              </div>
            </button>
          )})}
        </div>
      </div>

      <div className="slide-in rounded-xl border border-white/10 bg-[#1b2035] p-4" style={{ animationDelay: '120ms' }}>
        <h3 className="text-lg font-semibold text-[#f0f4ff]">Quick Links</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-white/5 bg-[#12172a] p-3">
            <p className="text-xs text-[#8f98bf]">Projects</p>
            <div className="mt-2 space-y-2">
              {topProjects.length ? topProjects.map((project) => (
                <button
                  key={project.project_id}
                  type="button"
                  onClick={() => onNavigate(`/projects/${encodeURIComponent(project.project_id)}`)}
                  className="block w-full rounded bg-white/5 px-2 py-1 text-left text-sm font-medium text-[#d9e2ff] hover:bg-white/10"
                >
                  {project.project_name}
                </button>
              )) : <EmptyState title="No projects yet" description="Create your first project to populate dashboard links." ctaLabel="Go to Projects" onCta={() => onNavigate('/projects')} />}
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-[#12172a] p-3">
            <p className="text-xs text-[#8f98bf]">Submittals</p>
            <div className="mt-2 space-y-2">
              {urgentSubmittals.length ? urgentSubmittals.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!item.project_id) return
                    onNavigate(`/projects/${encodeURIComponent(item.project_id)}/submittals/${item.id}`)
                  }}
                  className="block w-full rounded bg-white/5 px-2 py-1 text-left text-sm font-medium text-[#d9e2ff] hover:bg-white/10"
                >
                  {item.submittal_number || `Submittal ${item.id}`}
                </button>
              )) : <EmptyState title="No submittals" description="Open Projects and add one to track review workflow." ctaLabel="Go to Submittals" onCta={() => onNavigate('/submittals')} />}
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-[#12172a] p-3">
            <p className="text-xs text-[#8f98bf]">RFIs</p>
            <div className="mt-2 space-y-2">
              {urgentRfis.length ? urgentRfis.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!item.project_id) return
                    onNavigate(`/projects/${encodeURIComponent(item.project_id)}/rfis/${item.id}`)
                  }}
                  className="block w-full rounded bg-white/5 px-2 py-1 text-left text-sm font-medium text-[#d9e2ff] hover:bg-white/10"
                >
                  {item.rfi_number || `RFI ${item.id}`}
                </button>
              )) : <EmptyState title="No RFIs" description="Create an RFI to start communication tracking." ctaLabel="Go to RFIs" onCta={() => onNavigate('/rfis')} />}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <article className="slide-in rounded-xl border border-white/10 bg-[#1b2035] p-4" style={{ animationDelay: '180ms' }}>
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
              <p className="text-xs text-[#8f98bf]">Due This Week</p>
              <p className="text-2xl font-bold text-[#f0f4ff]">{submittalsDueSoon + rfisDueSoon}</p>
              <p className="mt-1 text-xs text-[#97a0c4]">{dueTodayCount} due today</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-[#12172a] p-3">
              <p className="text-xs text-[#8f98bf]">Overdue Pressure</p>
              <p className="text-2xl font-bold text-[#f0f4ff]">{overdueCount}</p>
              <p className="mt-1 text-xs text-[#97a0c4]">{summary.submittals_late} submittals and {summary.rfis_overdue_open} RFIs</p>
            </div>
          </div>
        </article>

        <article className="slide-in rounded-xl border border-white/10 bg-[#1b2035] p-4" style={{ animationDelay: '230ms' }}>
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

      <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr]">
        <article className="slide-in rounded-xl border border-white/10 bg-[#1b2035] p-4" style={{ animationDelay: '280ms' }}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-[#f0f4ff]">Attention Board</h3>
            <StatusBadge label={attentionItems.length ? `${attentionItems.length} critical items` : 'No urgent blockers'} tone={attentionItems.length ? 'warning' : 'success'} />
          </div>
          <div className="mt-3 space-y-2">
            {attentionItems.length ? attentionItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.path)}
                className="flex w-full items-start justify-between rounded-lg border border-[#2b3353] bg-[#12172a] px-3 py-3 text-left transition hover:border-[#ffcf76] hover:bg-[#171d34]"
              >
                <div>
                  <p className="text-sm font-semibold text-[#eef3ff]">{item.title}</p>
                  <p className="mt-1 text-xs text-[#97a0c4]">{item.meta}</p>
                </div>
                <span className="rounded-full bg-[#2a2030] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ffd072]">{item.type}</span>
              </button>
            )) : (
              <EmptyState title="No urgent items" description="Late submittals and overdue RFIs will show here for immediate follow-up." ctaLabel="Review Dashboard" onCta={() => onNavigate('/dashboard')} />
            )}
          </div>
        </article>

        <article className="slide-in rounded-xl border border-white/10 bg-[#1b2035] p-4" style={{ animationDelay: '320ms' }}>
          <h3 className="text-lg font-semibold text-[#f0f4ff]">Recent Activity</h3>
          <div className="mt-3 space-y-2">
            {recentActivity.length ? recentActivity.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.path)}
                className="w-full rounded-lg border border-[#2b3353] bg-[#12172a] px-3 py-3 text-left transition hover:border-[#8ba6ff] hover:bg-[#171d34]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#eef3ff]">{item.title}</p>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-[#8f98bf]">{item.kind}</span>
                </div>
                <p className="mt-1 text-xs text-[#97a0c4]">{item.subtitle}</p>
              </button>
            )) : (
              <EmptyState title="No activity yet" description="New submittals and RFIs will appear here as the workspace grows." ctaLabel="Go to Projects" onCta={() => onNavigate('/projects')} />
            )}
          </div>
        </article>

        <article className="slide-in rounded-xl border border-white/10 bg-[#1b2035] p-4" style={{ animationDelay: '360ms' }}>
          <h3 className="text-lg font-semibold text-[#f0f4ff]">Project Health</h3>
          <div className="mt-3 space-y-2">
            {projectHealth.length ? projectHealth.map((project) => (
              <button
                key={project.projectId}
                type="button"
                onClick={() => onNavigate(`/projects/${encodeURIComponent(project.projectId)}`)}
                className="w-full rounded-lg border border-[#2b3353] bg-[#12172a] px-3 py-3 text-left transition hover:border-[#5be1c7]/60 hover:bg-[#171d34]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#eef3ff]">{project.name}</p>
                    <p className="mt-1 text-xs text-[#97a0c4]">{project.openSubmittals} submittals open, {project.openRfis} RFIs open</p>
                  </div>
                  <StatusBadge label={project.late ? `${project.late} late` : 'On track'} tone={project.late ? 'warning' : 'success'} />
                </div>
              </button>
            )) : (
              <EmptyState title="No project load yet" description="Project health will populate once submittals or RFIs are linked to jobs." ctaLabel="Go to Projects" onCta={() => onNavigate('/projects')} />
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
