import DashboardHeader from '../components/dashboard/DashboardHeader'
import ProjectCard from '../components/dashboard/ProjectCard'
import type { AuthUser } from '../types/auth'
import type { DashboardSummary } from '../types/dashboard'
import type { Project } from '../types/project'

type DashboardPageProps = {
  user: AuthUser
  health: string
  summary: DashboardSummary
  projects: Project[]
  onLogout: () => void
}

const trackerRows = (summary: DashboardSummary) => [
  { label: 'Active Projects', value: summary.active_projects },
  { label: 'Submittals OPEN', value: summary.submittals_open },
  { label: 'Submittals LATE', value: summary.submittals_late },
  { label: 'RFIs OPEN', value: summary.rfis_open },
  { label: 'RFIs Overdue (Open)', value: summary.rfis_overdue_open },
  { label: 'Tasks Open/In Progress', value: summary.tasks_open_in_progress },
  { label: 'Tasks Overdue', value: summary.tasks_overdue },
]

export default function DashboardPage({ user, health, summary, projects, onLogout }: DashboardPageProps) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl p-6">
        <DashboardHeader health={health} user={user} onLogout={onLogout} />

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">PERSONAL CONSTRUCTION TRACKER</h2>
          <div className="mt-6 space-y-2">
            {trackerRows(summary).map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
              >
                <span className="text-lg font-semibold text-slate-800">{item.label}</span>
                <span className="min-w-8 text-right text-2xl font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {projects.length} total
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <p className="text-slate-700">No projects yet. Create one in Django admin.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
