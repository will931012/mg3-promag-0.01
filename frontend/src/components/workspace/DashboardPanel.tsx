import { useMemo, useState } from 'react'

import EmptyState from '../common/EmptyState'
import StatusBadge from '../common/StatusBadge'
import { formatDate } from '../register/registerUi'
import type { RegisterActivity, RegisterActivityItem } from '../../types/register'
import type { DashboardSummary, ProjectRecord, RfiRecord } from '../../types/workspace'

type DashboardPanelProps = {
  summary: DashboardSummary
  projects: ProjectRecord[]
  registerActivity: RegisterActivity
  rfis: RfiRecord[]
  onNavigate: (path: string) => void
}

type NextDue = { date: string; label: string }

type ProjectRow = {
  project: ProjectRecord
  openSubmittals: number
  submittalAlerts: number
  openRfis: number
  overdueRfis: number
  nextDue: NextDue | null
}

const isoToday = () => new Date().toISOString().slice(0, 10)

function isOpenSubmittal(item: RegisterActivityItem): boolean {
  return item.latest_rev !== null && item.ball_in_court !== 'Closed' && item.ball_in_court !== 'Superseded'
}

function isClosedRfi(item: RfiRecord): boolean {
  const lifecycle = String(item.lifecycle_status || '').toLowerCase()
  if (lifecycle === 'closed') return true
  if (lifecycle === 'opened') return false
  const status = String(item.status || '').toLowerCase()
  return status.includes('approved') || status.includes('closed') || status.includes('answered') || status.includes('complete')
}

function statusTone(status: string | null): 'neutral' | 'success' | 'warning' | 'info' {
  const text = String(status || '').toLowerCase()
  if (text.includes('construct')) return 'info'
  if (text.includes('prelim')) return 'warning'
  if (text.includes('complet') || text.includes('finish')) return 'success'
  return 'neutral'
}

const earliest = (current: NextDue | null, next: NextDue | null) => (!next ? current : !current || next.date < current.date ? next : current)

export default function DashboardPanel({ summary, projects, registerActivity, rfis, onNavigate }: DashboardPanelProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const today = isoToday()

  const rows = useMemo<ProjectRow[]>(() => {
    const byProject = new Map<string, ProjectRow>(
      projects.map((project) => [project.project_id, { project, openSubmittals: 0, submittalAlerts: 0, openRfis: 0, overdueRfis: 0, nextDue: null }])
    )
    registerActivity.items.forEach((item) => {
      const row = byProject.get(item.project_id)
      if (!row) return
      if (item.alert) row.submittalAlerts += 1
      if (isOpenSubmittal(item)) {
        row.openSubmittals += 1
        if (item.review_due) row.nextDue = earliest(row.nextDue, { date: item.review_due, label: `Submittal ${item.submittal_no}` })
      } else if (item.latest_rev === null && item.submit_by) {
        row.nextDue = earliest(row.nextDue, { date: item.submit_by, label: `Submit ${item.submittal_no}` })
      }
    })
    rfis.forEach((item) => {
      const row = item.project_id ? byProject.get(item.project_id) : undefined
      if (!row || isClosedRfi(item)) return
      row.openRfis += 1
      if (item.response_due) {
        if (item.response_due < today) row.overdueRfis += 1
        row.nextDue = earliest(row.nextDue, { date: item.response_due, label: item.rfi_number || `RFI ${item.id}` })
      }
    })
    return Array.from(byProject.values())
  }, [projects, registerActivity.items, rfis, today])

  const statusOptions = useMemo(
    () => Array.from(new Set(projects.map((project) => project.status).filter((value): value is string => Boolean(value)))).sort(),
    [projects]
  )

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows
      .filter((row) => !statusFilter || row.project.status === statusFilter)
      .filter((row) => !query || `${row.project.project_name} ${row.project.address || ''} ${row.project.developer || ''}`.toLowerCase().includes(query))
      .sort((a, b) => {
        // Projects with the nearest deadline first; projects with nothing due go last, by name.
        if (a.nextDue && b.nextDue) return a.nextDue.date.localeCompare(b.nextDue.date)
        if (a.nextDue) return -1
        if (b.nextDue) return 1
        return a.project.project_name.localeCompare(b.project.project_name)
      })
  }, [rows, search, statusFilter])

  const cards = [
    { label: 'Active projects', value: summary.active_projects, tone: 'neutral', path: '/projects' },
    { label: 'Open submittals', value: registerActivity.submittals_open, tone: 'info', path: '/submittals' },
    { label: 'Submittal alerts', value: registerActivity.alerts, tone: registerActivity.alerts ? 'danger' : 'neutral', path: '/submittals' },
    { label: 'Open RFIs', value: summary.rfis_open, tone: 'info', path: '/rfis' },
    { label: 'Overdue RFIs', value: summary.rfis_overdue_open, tone: summary.rfis_overdue_open ? 'danger' : 'neutral', path: '/rfis' },
  ] as const

  return (
    <section className="space-y-4 pt-2 text-ink-soft">
      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => onNavigate(card.path)}
            className="rounded-xl border border-line bg-raised p-3 text-left transition hover:border-accent hover:bg-hover"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{card.label}</p>
            <p className={`mt-1 text-3xl font-bold ${card.tone === 'danger' ? 'text-rose-700' : card.tone === 'info' ? 'text-sky-700' : 'text-ink'}`}>{card.value}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-raised p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Projects</h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects"
              aria-label="Search projects"
              className="rounded-lg border border-slate-300 bg-surface px-3 py-1.5 text-sm text-slate-900"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Project status"
              className="rounded-lg border border-slate-300 bg-surface px-3 py-1.5 text-sm text-slate-900"
            >
              <option value="">All statuses</option>
              {statusOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No projects yet" description="Create your first project to see it here." ctaLabel="Go to Projects" onCta={() => onNavigate('/projects')} />
          </div>
        ) : (
          <div className="ui-scroll mt-3 overflow-x-auto">
            <table className="ui-table min-w-[760px]">
              <thead>
                <tr className="bg-slate-100">
                  {['Project', 'Status', 'Open submittals', 'Open RFIs', 'Next due'].map((header) => (
                    <th key={header} className="border px-3 py-2 text-left">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const overdue = row.nextDue ? row.nextDue.date < today : false
                  return (
                    <tr
                      key={row.project.project_id}
                      onClick={() => onNavigate(`/projects/${encodeURIComponent(row.project.project_id)}`)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="border px-3 py-2">
                        <span className="font-semibold text-slate-900">{row.project.project_name}</span>
                        {row.project.address ? <span className="block text-xs text-slate-500">{row.project.address}</span> : null}
                      </td>
                      <td className="whitespace-nowrap border px-3 py-2">
                        {row.project.status ? <StatusBadge label={row.project.status} tone={statusTone(row.project.status)} /> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="whitespace-nowrap border px-3 py-2">
                        {row.openSubmittals}
                        {row.submittalAlerts ? <span className="ml-2"><StatusBadge label={`${row.submittalAlerts} alert${row.submittalAlerts > 1 ? 's' : ''}`} tone="danger" /></span> : null}
                      </td>
                      <td className="whitespace-nowrap border px-3 py-2">
                        {row.openRfis}
                        {row.overdueRfis ? <span className="ml-2"><StatusBadge label={`${row.overdueRfis} overdue`} tone="danger" /></span> : null}
                      </td>
                      <td className="whitespace-nowrap border px-3 py-2">
                        {row.nextDue ? (
                          <>
                            <span className={overdue ? 'font-semibold text-rose-700' : 'text-slate-900'}>{formatDate(row.nextDue.date)}</span>
                            <span className="block text-xs text-slate-500">{overdue ? 'Overdue · ' : ''}{row.nextDue.label}</span>
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {visibleRows.length === 0 ? <p className="mt-3 text-sm text-slate-500">No projects match the search.</p> : null}
          </div>
        )}
      </div>
    </section>
  )
}
