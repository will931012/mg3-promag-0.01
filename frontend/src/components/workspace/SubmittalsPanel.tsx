import { useEffect } from 'react'

import EmptyState from '../common/EmptyState'
import SectionHeader from '../common/SectionHeader'
import RegisterView from '../register/RegisterView'
import type { ProjectRecord } from '../../types/workspace'

type SubmittalsPanelProps = {
  token: string
  projects: ProjectRecord[]
  routeProjectId: string | null
  routeItemId: number | null
  onNavigate: (path: string) => void
  setMessage: (message: string) => void
  onChanged: () => void
}

const LAST_PROJECT_KEY = 'promag_register_project'

const registerPath = (projectId: string, itemId?: number | null) =>
  `/submittals/${encodeURIComponent(projectId)}${itemId ? `/items/${itemId}` : ''}`

export default function SubmittalsPanel({ token, projects, routeProjectId, routeItemId, onNavigate, setMessage, onChanged }: SubmittalsPanelProps) {
  const project = projects.find((item) => item.project_id === routeProjectId) ?? null

  // Open the last project used (or the first one) when no project is in the URL.
  useEffect(() => {
    if (routeProjectId || !projects.length) return
    let remembered: string | null = null
    try {
      remembered = localStorage.getItem(LAST_PROJECT_KEY)
    } catch {
      remembered = null
    }
    const target = projects.find((item) => item.project_id === remembered) ?? projects[0]
    onNavigate(registerPath(target.project_id))
  }, [routeProjectId, projects, onNavigate])

  useEffect(() => {
    if (!routeProjectId) return
    try {
      localStorage.setItem(LAST_PROJECT_KEY, routeProjectId)
    } catch {
      // Remembering the project is only a convenience.
    }
  }, [routeProjectId])

  return (
    <section className="ui-panel slide-in">
      <SectionHeader
        title="Shop Drawing Register"
        subtitle="Every submittal for the project, its submissions and who has the ball."
        actions={
          projects.length ? (
            <select
              value={project?.project_id ?? ''}
              onChange={(event) => onNavigate(registerPath(event.target.value))}
              aria-label="Project"
              className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-900"
            >
              {project ? null : <option value="">Select a project</option>}
              {projects.map((item) => (
                <option key={item.project_id} value={item.project_id}>{item.project_name}</option>
              ))}
            </select>
          ) : null
        }
      />
      {!projects.length ? (
        <div className="mt-4">
          <EmptyState title="No projects yet" description="Create a project first. Every new project starts with the full register." ctaLabel="Go to Projects" onCta={() => onNavigate('/projects')} />
        </div>
      ) : null}
      {project ? (
        <RegisterView
          key={project.project_id}
          token={token}
          projectId={project.project_id}
          selectedItemId={routeItemId}
          onOpenItem={(itemId) => onNavigate(registerPath(project.project_id, itemId))}
          setMessage={setMessage}
          onChanged={onChanged}
        />
      ) : routeProjectId ? (
        <div className="mt-4">
          <EmptyState title="Project not found" description="Pick another project from the list." />
        </div>
      ) : null}
    </section>
  )
}
