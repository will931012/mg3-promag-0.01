import { useEffect, useState } from 'react'

import EmptyState from '../common/EmptyState'
import SectionHeader from '../common/SectionHeader'
import ContactsAgenda from '../project/ContactsAgenda'
import ProjectContacts from '../project/ProjectContacts'
import type { ProjectRecord } from '../../types/workspace'

type ContactsPanelProps = {
  token: string
  projects: ProjectRecord[]
  routeProjectId: string | null
  onNavigate: (path: string) => void
  setMessage: (message: string) => void
}

const LAST_PROJECT_KEY = 'promag_contacts_project'
const VIEW_KEY = 'promag_contacts_view'
type View = 'agenda' | 'sheet'

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'sheet' ? 'sheet' : 'agenda'
  } catch {
    return 'agenda'
  }
}
const contactsPath = (projectId: string) => `/contacts/${encodeURIComponent(projectId)}`

/**
 * Contacts are kept per project: pick a project and edit its contact sheet
 * (design team / reviewers, general contractor and subcontractors).
 */
export default function ContactsPanel({ token, projects, routeProjectId, onNavigate, setMessage }: ContactsPanelProps) {
  const project = projects.find((item) => item.project_id === routeProjectId) ?? null
  const [view, setView] = useState<View>(readView)
  const changeView = (next: View) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // Only a preference.
    }
  }

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
    onNavigate(contactsPath(target.project_id))
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
        title="Contacts"
        subtitle="Each project has its own contact sheet. Companies used on other projects are suggested as you type."
        actions={
          projects.length ? (
            <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5" role="group" aria-label="View">
              {([['agenda', 'Address book'], ['sheet', 'Sheet']] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeView(key)}
                  aria-pressed={view === key}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === key ? 'bg-brand-700 text-white' : 'text-slate-700 hover:bg-hover'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <select
              value={project?.project_id ?? ''}
              onChange={(event) => onNavigate(contactsPath(event.target.value))}
              aria-label="Project"
              className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-900"
            >
              {project ? null : <option value="">Select a project</option>}
              {projects.map((item) => (
                <option key={item.project_id} value={item.project_id}>{item.project_name}</option>
              ))}
            </select>
            </div>
          ) : null
        }
      />
      {!projects.length ? (
        <div className="mt-4">
          <EmptyState title="No projects yet" description="Create a project first; each project gets its own contact sheet." ctaLabel="Go to Projects" onCta={() => onNavigate('/projects')} />
        </div>
      ) : null}
      {project ? (
        view === 'agenda' ? (
          <ContactsAgenda key={project.project_id} token={token} projectId={project.project_id} setMessage={setMessage} />
        ) : (
          <ProjectContacts key={project.project_id} token={token} projectId={project.project_id} setMessage={setMessage} sheetOnly />
        )
      ) : routeProjectId ? (
        <div className="mt-4">
          <EmptyState title="Project not found" description="Pick another project from the list." />
        </div>
      ) : null}
    </section>
  )
}
