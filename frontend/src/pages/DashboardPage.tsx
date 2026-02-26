import DashboardHeader from '../components/dashboard/DashboardHeader'
import ProjectCard from '../components/dashboard/ProjectCard'
import type { AuthUser } from '../types/auth'
import type { Project } from '../types/project'

type DashboardPageProps = {
  user: AuthUser
  health: string
  projects: Project[]
  onLogout: () => void
}

export default function DashboardPage({ user, health, projects, onLogout }: DashboardPageProps) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl p-6">
        <DashboardHeader health={health} user={user} onLogout={onLogout} />

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
