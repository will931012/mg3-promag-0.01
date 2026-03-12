import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

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

type RouteState = {
  tab: TabId
  projectId: string | null
  submittalId: number | null
  rfiId: number | null
}

function parsePath(pathname: string): RouteState {
  const clean = pathname === '/' ? '/dashboard' : pathname
  const submittalMatch = clean.match(/^\/projects\/([^/]+)\/submittals\/(\d+)$/)
  if (submittalMatch) {
    return {
      tab: 'projects',
      projectId: decodeURIComponent(submittalMatch[1]),
      submittalId: Number(submittalMatch[2]),
      rfiId: null,
    }
  }

  const rfiMatch = clean.match(/^\/projects\/([^/]+)\/rfis\/(\d+)$/)
  if (rfiMatch) {
    return {
      tab: 'projects',
      projectId: decodeURIComponent(rfiMatch[1]),
      submittalId: null,
      rfiId: Number(rfiMatch[2]),
    }
  }

  const projectMatch = clean.match(/^\/projects\/([^/]+)$/)
  if (projectMatch) {
    return {
      tab: 'projects',
      projectId: decodeURIComponent(projectMatch[1]),
      submittalId: null,
      rfiId: null,
    }
  }

  if (clean === '/projects') return { tab: 'projects', projectId: null, submittalId: null, rfiId: null }
  if (clean === '/submittals') return { tab: 'submittals', projectId: null, submittalId: null, rfiId: null }
  if (clean === '/rfis') return { tab: 'rfis', projectId: null, submittalId: null, rfiId: null }
  if (clean === '/users') return { tab: 'users', projectId: null, submittalId: null, rfiId: null }
  return { tab: 'dashboard', projectId: null, submittalId: null, rfiId: null }
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
  const [menuOpen, setMenuOpen] = useState(true)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const location = useLocation()
  const navigateTo = useNavigate()

  useEffect(() => {
    if (location.pathname === '/') {
      navigateTo('/dashboard', { replace: true })
    }
  }, [location.pathname, navigateTo])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (window.innerWidth >= 768 || !menuOpen) return
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [menuOpen])

  const route = useMemo(() => parsePath(location.pathname), [location.pathname])
  const isErrorMessage = /fail|error|unable|invalid/i.test(message)

  const navigate = (nextPath: string) => {
    if (location.pathname === nextPath) return
    navigateTo(nextPath)
  }

  const navItems: Array<[TabId, string]> = [
    ['dashboard', 'Dashboard'],
    ['projects', 'Projects'],
    ['submittals', 'Submittals'],
    ['rfis', 'RFIs'],
    ['users', 'Users'],
  ]
  const menuToggleLabel = menuOpen ? 'Cerrar menu' : 'Abrir menu'
  const sidebarMarkers = ['GRID', 'LVL', 'AOR', 'EOR', 'RFI', 'SUB']

  return (
    <div className="neo-dashboard min-h-screen bg-[#151823] px-3 py-5 md:px-8 md:py-6">
      <div
        className={`mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-3 rounded-[26px] border border-white/5 bg-[linear-gradient(130deg,#141726,#1a1e2f)] p-3 shadow-[0_40px_80px_rgba(0,0,0,0.45)] ${
          menuOpen ? 'md:grid-cols-[60px_220px_1fr]' : 'md:grid-cols-[60px_1fr]'
        }`}
      >
        <aside className="hidden rounded-2xl bg-[#0f1220] p-3 md:flex md:flex-col md:items-center md:justify-between">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="mt-1 flex min-h-[52px] w-full flex-col items-center justify-center rounded-xl border border-[#2f3b61] bg-[linear-gradient(180deg,#1a2138,#141a2d)] px-2 py-2 text-[#dbe2ff] transition hover:bg-[#212844]"
            aria-label={menuToggleLabel}
            title={menuToggleLabel}
          >
            <span className="text-lg leading-none">{menuOpen ? '[' : ']'}{menuOpen ? '<' : '>'}</span>
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em]">{menuOpen ? 'Hide Nav' : 'Show Nav'}</span>
          </button>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#7b83a8]">
            <div className="relative flex h-full flex-col items-center justify-center gap-3">
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#2e3a60] to-transparent" />
              <div className="relative flex h-8 w-8 items-center justify-center rounded-md border border-[#3a4b78] bg-[#151a30] text-[9px] font-bold tracking-[0.18em] text-[#d3dcff]">
                AX
              </div>
            {sidebarMarkers.map((marker) => (
                <div key={marker} className="relative flex h-10 w-10 items-center justify-center">
                  <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#89a4ff]" />
                  <span className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#314067]" />
                  <span className="absolute left-[calc(100%+6px)] top-1/2 -translate-y-1/2 rounded-md border border-[#314067] bg-[#151a30] px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.14em] text-[#aeb8df]">
                    {marker}
                  </span>
                </div>
            ))}
            <div className="relative grid h-12 w-12 grid-cols-3 gap-1 rounded-lg border border-[#314067] bg-[#151a30] p-1">
              <span className="rounded-sm bg-[#5a678f]" />
              <span className="rounded-sm bg-[#2d3758]" />
              <span className="rounded-sm bg-[#5a678f]" />
              <span className="rounded-sm bg-[#2d3758]" />
              <span className="rounded-sm bg-[#89a4ff]" />
              <span className="rounded-sm bg-[#2d3758]" />
              <span className="rounded-sm bg-[#5a678f]" />
              <span className="rounded-sm bg-[#2d3758]" />
              <span className="rounded-sm bg-[#5a678f]" />
            </div>
            </div>
          </div>
          <span className="mb-1 rounded-md border border-[#314067] bg-[#151a30] px-2 py-1 text-[10px] font-semibold tracking-[0.16em] text-[#9ba7cf]">SHEET A-01</span>
        </aside>

        <aside
          ref={menuRef}
          className={`${menuOpen ? 'block' : 'hidden'} fixed inset-y-3 left-3 z-40 w-[250px] rounded-2xl bg-[#111528] p-4 shadow-2xl md:static md:w-auto md:p-5 md:shadow-none`}
        >
          <div className="mb-4 border-b border-white/10 pb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8f98bf]">MG3 Group</p>
            <p className="mt-1 text-sm font-semibold text-[#dbe2ff]">Project Management</p>
          </div>
          <nav className="space-y-2">
            {navItems.map(([id, label]) => (
              <button
                key={id}
                onClick={() => navigate(`/${id}`)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                  route.tab === id ? 'bg-[#b9f5eb] font-semibold text-[#0f172a]' : 'text-[#8a92b2] hover:bg-white/5 hover:text-[#dbe2ff]'
                }`}
              >
                <span>{label}</span>
                <span className="text-xs">{'>'}</span>
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
        {menuOpen ? <button type="button" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-black/35 md:hidden" aria-label="Close menu overlay" /> : null}

        <main className="rounded-2xl bg-[#101426] p-4 md:p-5">
          <header className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-[#1a1f35] p-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-[#dbe2ff] md:hidden"
            >
              Abrir menu
            </button>
            <label className="min-w-[220px] flex-1">
              <input
                readOnly
                aria-label="Workspace search"
                placeholder="Search projects, submittals, RFIs..."
                className="w-full rounded-lg border border-white/10 bg-[#111528] px-3 py-2 text-sm text-[#c8d2f2] placeholder:text-[#7f89ae]"
              />
            </label>
            <span className="rounded-full bg-[#101426] px-3 py-1 text-xs text-[#9da7cd]">Today</span>
            <span className="rounded-full bg-[#101426] px-3 py-1 text-xs text-[#9da7cd]">{user.username}</span>
          </header>

          {message ? (
            <div className={`save-toast fixed bottom-4 right-4 z-50 max-w-sm rounded-lg px-3 py-2 text-sm shadow-lg ${isErrorMessage ? 'border border-rose-300/70 bg-rose-50 text-rose-800' : 'border border-emerald-300/60 bg-emerald-50 text-emerald-800'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <span className={`toast-check mt-[1px] inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${isErrorMessage ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isErrorMessage ? '!' : '✓'}
                  </span>
                  <p>{message}</p>
                </div>
                <button type="button" onClick={() => setMessage('')} className={`rounded px-2 py-0.5 text-xs ${isErrorMessage ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  Close
                </button>
              </div>
            </div>
          ) : null}

          {route.tab === 'dashboard' ? (
            <DashboardPanel summary={summary} projects={projects} submittals={submittals} rfis={rfis} onNavigate={navigate} />
          ) : null}
          {route.tab === 'projects' ? (
            <ProjectsPanel
              token={token}
              projects={projects}
              submittals={submittals}
              rfis={rfis}
              routeProjectId={route.projectId}
              routeSubmittalId={route.submittalId}
              routeRfiId={route.rfiId}
              onNavigate={navigate}
              setMessage={setMessage}
              refreshWorkspace={refreshWorkspace}
            />
          ) : null}
          {route.tab === 'submittals' ? (
            <SubmittalsPanel token={token} projects={projects} submittals={submittals} setMessage={setMessage} refreshWorkspace={refreshWorkspace} />
          ) : null}
          {route.tab === 'rfis' ? (
            <RfisPanel token={token} projects={projects} rfis={rfis} setMessage={setMessage} refreshWorkspace={refreshWorkspace} />
          ) : null}
          {route.tab === 'users' ? <UsersPanel users={users} /> : null}
        </main>
      </div>
    </div>
  )
}
