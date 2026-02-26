import { formatMoney } from '../../app/formatters'
import { statusLabel, statusStyles } from '../../app/projectStatus'
import type { Project } from '../../types/project'

type ProjectCardProps = {
  project: Project
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">{project.name}</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[project.status]}`}>
          {statusLabel(project.status)}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-700">{project.location}</p>
      <p className="mt-1 text-sm text-slate-500">Client: {project.client}</p>
      <p className="mt-1 text-sm text-slate-500">Budget: ${formatMoney(project.budget)}</p>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
          <span>Progress</span>
          <span>{project.progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-600"
            style={{ width: `${Math.max(0, Math.min(100, project.progress))}%` }}
          />
        </div>
      </div>
    </article>
  )
}
