import { useState } from 'react'

import ActionItemsPanel from '../components/workspace/ActionItemsPanel'
import DashboardPanel from '../components/workspace/DashboardPanel'
import ProjectsPanel from '../components/workspace/ProjectsPanel'
import RfisPanel from '../components/workspace/RfisPanel'
import SubmittalsPanel from '../components/workspace/SubmittalsPanel'
import UsersPanel from '../components/workspace/UsersPanel'
import type { AuthUser } from '../types/auth'
import type { ActionItemRecord, DashboardSummary, ProjectRecord, RfiRecord, SubmittalRecord } from '../types/workspace'

type TabId = 'dashboard' | 'projects' | 'submittals' | 'rfis' | 'actions' | 'users'

type WorkspacePageProps = {
  health: string
  user: AuthUser
  token: string
  summary: DashboardSummary
  projects: ProjectRecord[]
  submittals: SubmittalRecord[]
  rfis: RfiRecord[]
  actionItems: ActionItemRecord[]
  users: AuthUser[]
  message: string
  setMessage: (message: string) => void
  onLogout: () => void
  refreshWorkspace: (token: string) => Promise<void>
}

export default function WorkspacePage({
  health,
  user,
  token,
  summary,
  projects,
  submittals,
  rfis,
  actionItems,
  users,
  message,
  setMessage,
  onLogout,
  refreshWorkspace,
}: WorkspacePageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[1400px] p-6">
        <header className="rounded-2xl bg-[linear-gradient(135deg,#1f63b1,#214876)] p-7 text-white shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-100">MG3 Group</p>
          <h1 className="mt-2 text-4xl font-semibold">ProMag Project Management</h1>
          <p className="mt-1 text-brand-100">Track projects, submittals, RFIs, and action items in one workspace.</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">API: {health}</span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{user.username}</span>
            <button onClick={onLogout} className="rounded-full border border-white/35 px-3 py-1 text-xs font-semibold transition hover:bg-white/10">
              Logout
            </button>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {([
            ['dashboard', 'Dashboard'],
            ['projects', 'Projects'],
            ['submittals', 'Submittals'],
            ['rfis', 'RFIs'],
            ['actions', 'Action Items'],
            ['users', 'Users'],
          ] as Array<[TabId, string]>).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === id ? 'bg-brand-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {message ? <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</p> : null}

        {activeTab === 'dashboard' ? <DashboardPanel summary={summary} /> : null}
        {activeTab === 'projects' ? (
          <ProjectsPanel token={token} projects={projects} setMessage={setMessage} refreshWorkspace={refreshWorkspace} />
        ) : null}
        {activeTab === 'submittals' ? (
          <SubmittalsPanel token={token} projects={projects} submittals={submittals} setMessage={setMessage} refreshWorkspace={refreshWorkspace} />
        ) : null}
        {activeTab === 'rfis' ? (
          <RfisPanel token={token} projects={projects} rfis={rfis} setMessage={setMessage} refreshWorkspace={refreshWorkspace} />
        ) : null}
        {activeTab === 'actions' ? (
          <ActionItemsPanel token={token} projects={projects} actionItems={actionItems} setMessage={setMessage} refreshWorkspace={refreshWorkspace} />
        ) : null}
        {activeTab === 'users' ? <UsersPanel users={users} /> : null}
      </div>
    </div>
  )
}
