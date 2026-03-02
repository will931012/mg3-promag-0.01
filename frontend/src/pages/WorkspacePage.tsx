import { useState } from 'react'

import DashboardPanel from '../components/workspace/DashboardPanel'
import ProjectsPanel from '../components/workspace/ProjectsPanel'
import RfisPanel from '../components/workspace/RfisPanel'
import SubmittalsPanel from '../components/workspace/SubmittalsPanel'
import UsersPanel from '../components/workspace/UsersPanel'
import type { AuthUser } from '../types/auth'
import type { DashboardSummary, ProjectRecord, RfiRecord, SubmittalRecord } from '../types/workspace'

type TabId = 'dashboard' | 'projects' | 'submittals' | 'rfis' | 'users'

type WorkspacePageProps = {
  health: string
  user: AuthUser
  token: string
  summary: DashboardSummary
  projects: ProjectRecord[]
  submittals: SubmittalRecord[]
  rfis: RfiRecord[]
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
  users,
  message,
  setMessage,
  onLogout,
  refreshWorkspace,
}: WorkspacePageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const navItems: Array<[TabId, string]> = [
    ['dashboard', 'Dashboard'],
    ['projects', 'Profile'],
    ['submittals', 'Order'],
    ['rfis', 'Sales Report'],
    ['users', 'Settings'],
  ]

  return (
    <div className="neo-dashboard min-h-screen bg-[#151823] px-4 py-6 md:px-8">
      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-3 rounded-[26px] border border-white/5 bg-[linear-gradient(130deg,#141726,#1a1e2f)] p-3 shadow-[0_40px_80px_rgba(0,0,0,0.45)] md:grid-cols-[60px_220px_1fr]">
        <aside className="hidden rounded-2xl bg-[#0f1220] p-3 md:flex md:flex-col md:items-center md:justify-between">
          <div className="mt-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
            <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
            <span className="h-2 w-2 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex flex-col gap-4 text-[#7b83a8]">
            <span>◦</span>
            <span>◦</span>
            <span>◦</span>
            <span>◦</span>
            <span>◦</span>
            <span>◦</span>
            <span>◦</span>
          </div>
          <span className="mb-1 text-xs text-[#7b83a8]">•</span>
        </aside>

        <aside className="rounded-2xl bg-[#111528] p-4 md:p-5">
          <div className="mb-4 border-b border-white/10 pb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8f98bf]">MG3 Group</p>
            <p className="mt-1 text-sm font-semibold text-[#dbe2ff]">Sales Workspace</p>
          </div>
          <nav className="space-y-2">
            {navItems.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeTab === id ? 'bg-[#b9f5eb] font-semibold text-[#0f172a]' : 'text-[#8a92b2] hover:bg-white/5 hover:text-[#dbe2ff]'
                }`}
              >
                <span>{label}</span>
                <span className="text-xs">›</span>
              </button>
            ))}
          </nav>

          <div className="mt-6 rounded-xl border border-white/10 bg-[#171c31] p-3 text-xs text-[#95a0c7]">
            <p>API: <span className="font-semibold text-[#cfd8fb]">{health}</span></p>
            <p className="mt-1">User: <span className="font-semibold text-[#cfd8fb]">{user.username}</span></p>
            <button onClick={onLogout} className="mt-3 w-full rounded-md border border-white/20 py-1.5 text-[#dfe6ff] hover:bg-white/10">
              Logout
            </button>
          </div>
        </aside>

        <main className="rounded-2xl bg-[#101426] p-4 md:p-5">
          <header className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-[#1a1f35] p-3">
            <label className="min-w-[220px] flex-1">
              <input
                readOnly
                value="Search here..."
                className="w-full rounded-lg border border-white/5 bg-[#111528] px-3 py-2 text-sm text-[#7f89ae]"
              />
            </label>
            <span className="rounded-full bg-[#101426] px-3 py-1 text-xs text-[#9da7cd]">Today</span>
            <span className="rounded-full bg-[#101426] px-3 py-1 text-xs text-[#9da7cd]">{user.username}</span>
          </header>

          {message ? <p className="mb-3 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}

          {activeTab === 'dashboard' ? (
            <DashboardPanel summary={summary} projects={projects} submittals={submittals} rfis={rfis} />
          ) : null}
          {activeTab === 'projects' ? (
            <ProjectsPanel token={token} projects={projects} setMessage={setMessage} refreshWorkspace={refreshWorkspace} />
          ) : null}
          {activeTab === 'submittals' ? (
            <SubmittalsPanel token={token} projects={projects} submittals={submittals} setMessage={setMessage} refreshWorkspace={refreshWorkspace} />
          ) : null}
          {activeTab === 'rfis' ? (
            <RfisPanel token={token} projects={projects} rfis={rfis} setMessage={setMessage} refreshWorkspace={refreshWorkspace} />
          ) : null}
          {activeTab === 'users' ? <UsersPanel users={users} /> : null}
        </main>
      </div>
    </div>
  )
}
