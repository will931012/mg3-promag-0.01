import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useRecentProjects } from '../app/recentProjects'
import { useTheme } from '../app/theme'
import type { SearchResult } from '../components/layout/GlobalSearch'
import Sidebar from '../components/layout/Sidebar'
import type { NavGroup } from '../components/layout/Sidebar'
import TopBar from '../components/layout/TopBar'

import DashboardPanel from '../components/workspace/DashboardPanel'
import ContactsPanel from '../components/workspace/ContactsPanel'
import MasterListPanel from '../components/workspace/MasterListPanel'
import ProjectsPanel from '../components/workspace/ProjectsPanel'
import RfisPanel from '../components/workspace/RfisPanel'
import SubmittalsPanel from '../components/workspace/SubmittalsPanel'
import UsersPanel from '../components/workspace/UsersPanel'
import type { AuthUser } from '../types/auth'
import type { RegisterActivity } from '../types/register'
import type { DashboardSummary, ProjectRecord, RfiRecord } from '../types/workspace'

type TabId = 'dashboard' | 'projects' | 'submittals' | 'rfis' | 'contacts' | 'users' | 'master'

type WorkspacePageProps = {
  health: string
  user: AuthUser
  token: string
  summary: DashboardSummary
  projects: ProjectRecord[]
  registerActivity: RegisterActivity
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

const emptyRoute = { projectId: null, submittalId: null, rfiId: null }

function parsePath(pathname: string): RouteState {
  const clean = pathname === '/' ? '/dashboard' : pathname
  // Register: /submittals/:projectId and /submittals/:projectId/items/:itemId (submittalId is the register item id)
  const registerMatch = clean.match(/^\/submittals\/([^/]+)(?:\/items\/(\d+))?$/)
  if (registerMatch) {
    return {
      tab: 'submittals',
      projectId: decodeURIComponent(registerMatch[1]),
      submittalId: registerMatch[2] ? Number(registerMatch[2]) : null,
      rfiId: null,
    }
  }
  const contactsMatch = clean.match(/^\/contacts\/([^/]+)$/)
  if (contactsMatch) return { tab: 'contacts', ...emptyRoute, projectId: decodeURIComponent(contactsMatch[1]) }
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
  if (clean === '/contacts') return { tab: 'contacts', projectId: null, submittalId: null, rfiId: null }
  if (clean === '/users') return { tab: 'users', projectId: null, submittalId: null, rfiId: null }
  if (clean === '/master-list') return { tab: 'master', ...emptyRoute }
  return { tab: 'dashboard', projectId: null, submittalId: null, rfiId: null }
}

const TAB_TITLES: Record<TabId, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  submittals: 'Submittals',
  rfis: 'RFIs',
  contacts: 'Contacts',
  users: 'Users',
  master: 'Master List',
}

const SIDEBAR_COLLAPSED_KEY = 'promag_sidebar_collapsed'

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export default function WorkspacePage({
  health,
  user,
  token,
  summary,
  projects,
  registerActivity,
  rfis,
  users,
  message,
  setMessage,
  onLogout,
  refreshWorkspace,
}: WorkspacePageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)
  const [workspaceSearch, setWorkspaceSearch] = useState('')
  const location = useLocation()
  const navigateTo = useNavigate()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    if (location.pathname === '/') {
      navigateTo('/dashboard', { replace: true })
    }
  }, [location.pathname, navigateTo])

  const route = useMemo(() => parsePath(location.pathname), [location.pathname])
  const isErrorMessage = /fail|error|unable|invalid/i.test(message)
  const openProject = route.projectId ? projects.find((project) => project.project_id === route.projectId) ?? null : null
  const recentProjectIds = useRecentProjects(openProject?.project_id ?? null)
  const recentProjects = useMemo(
    () =>
      recentProjectIds
        .map((id) => projects.find((project) => project.project_id === id))
        .filter((project): project is ProjectRecord => Boolean(project))
        .slice(0, 5)
        .map((project) => ({ id: project.project_id, name: project.project_name })),
    [recentProjectIds, projects]
  )

  const pageTitle = TAB_TITLES[route.tab]
  useEffect(() => {
    document.title = `${openProject ? `${openProject.project_name} · ` : ''}${pageTitle} | ProMag`
  }, [pageTitle, openProject])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const navigate = (nextPath: string) => {
    if (location.pathname === nextPath) return
    navigateTo(nextPath)
  }

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '0' : '1')
      } catch {
        // Only a preference; ignore storage errors.
      }
      return !collapsed
    })
  }

  const navGroups: NavGroup[] = [
    { label: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'dashboard' }] },
    {
      label: 'Work',
      items: [
        { id: 'projects', label: 'Projects', path: '/projects', icon: 'projects' },
        { id: 'submittals', label: 'Submittals', path: '/submittals', icon: 'submittals', badge: registerActivity.alerts, badgeLabel: 'alerts' },
        { id: 'rfis', label: 'RFIs', path: '/rfis', icon: 'rfis', badge: summary.rfis_overdue_open, badgeLabel: 'overdue' },
      ],
    },
    {
      label: 'Directory',
      items: [
        { id: 'contacts', label: 'Contacts', path: '/contacts', icon: 'contacts' },
        { id: 'users', label: 'Users', path: '/users', icon: 'users' },
      ],
    },
    ...(user.is_admin ? [{ label: 'Admin', items: [{ id: 'master', label: 'Master List', path: '/master-list', icon: 'master' as const }] }] : []),
  ]
  const refreshRegisterCounts = () => void refreshWorkspace(token)

  const searchResults = useMemo<SearchResult[]>(() => {
    const query = workspaceSearch.trim().toLowerCase()
    if (!query) return []
    return [
      ...projects
        .filter((project) => `${project.project_name} ${project.project_id} ${project.address || ''}`.toLowerCase().includes(query))
        .map((project) => ({
          id: `project-${project.project_id}`,
          type: 'Project',
          title: project.project_name,
          subtitle: project.address || project.project_id,
          path: `/projects/${encodeURIComponent(project.project_id)}`,
        })),
      ...registerActivity.items
        .filter((item) => `${item.submittal_no} ${item.description} ${item.project_name}`.toLowerCase().includes(query))
        .map((item) => ({
          id: `submittal-${item.id}`,
          type: 'Submittal',
          title: item.submittal_no,
          subtitle: `${item.description} · ${item.project_name}`,
          path: `/submittals/${encodeURIComponent(item.project_id)}/items/${item.id}`,
        })),
      ...rfis
        .filter((item) => `${item.rfi_number || ''} ${item.subject || ''} ${item.project_id || ''}`.toLowerCase().includes(query))
        .map((item) => ({
          id: `rfi-${item.id}`,
          type: 'RFI',
          title: item.rfi_number || `RFI ${item.id}`,
          subtitle: item.subject || item.project_id || 'No subject',
          path: item.project_id ? `/projects/${encodeURIComponent(item.project_id)}/rfis/${item.id}` : '/rfis',
        })),
    ].slice(0, 8)
  }, [workspaceSearch, projects, registerActivity.items, rfis])

  return (
    <div className="min-h-screen bg-canvas text-ink md:flex">
      <Sidebar
        groups={navGroups}
        activeId={route.tab}
        recentProjects={recentProjects}
        activeProjectId={openProject?.project_id ?? null}
        health={health}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onToggleCollapsed={toggleSidebar}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onNavigate={navigate}
      />

      <div className="min-w-0 flex-1">
        <TopBar
          title={pageTitle}
          subtitle={openProject?.project_name}
          user={user}
          theme={theme}
          searchQuery={workspaceSearch}
          searchResults={searchResults}
          onSearchQueryChange={setWorkspaceSearch}
          onSearchSelect={(result) => {
            setWorkspaceSearch('')
            navigate(result.path)
          }}
          onToggleTheme={toggleTheme}
          onOpenMenu={() => setMobileMenuOpen(true)}
          onLogout={onLogout}
        />

        <main className="min-w-0 px-4 pb-10 md:px-6">
          {message ? (
            <div
              role="status"
              className={`save-toast fixed bottom-4 right-4 z-50 max-w-sm rounded-lg px-3 py-2 text-sm shadow-lg ${isErrorMessage ? 'border border-rose-300/70 bg-rose-50 text-rose-800' : 'border border-emerald-300/60 bg-emerald-50 text-emerald-800'}`}
            >
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
            <DashboardPanel summary={summary} projects={projects} registerActivity={registerActivity} rfis={rfis} onNavigate={navigate} />
          ) : null}
          {route.tab === 'projects' ? (
            <ProjectsPanel
              token={token}
              projects={projects}
              rfis={rfis}
              routeProjectId={route.projectId}
              routeSubmittalId={route.submittalId}
              routeRfiId={route.rfiId}
              onNavigate={navigate}
              setMessage={setMessage}
              refreshWorkspace={refreshWorkspace}
              onRegisterChanged={refreshRegisterCounts}
            />
          ) : null}
          {route.tab === 'submittals' ? (
            <SubmittalsPanel
              token={token}
              projects={projects}
              routeProjectId={route.projectId}
              routeItemId={route.submittalId}
              onNavigate={navigate}
              setMessage={setMessage}
              onChanged={refreshRegisterCounts}
            />
          ) : null}
          {route.tab === 'rfis' ? (
            <RfisPanel token={token} projects={projects} rfis={rfis} setMessage={setMessage} refreshWorkspace={refreshWorkspace} />
          ) : null}
          {route.tab === 'contacts' ? (
            <ContactsPanel token={token} projects={projects} routeProjectId={route.projectId} onNavigate={navigate} setMessage={setMessage} />
          ) : null}
          {route.tab === 'users' ? (
            <UsersPanel token={token} users={users} currentUser={user} setMessage={setMessage} refreshWorkspace={refreshWorkspace} />
          ) : null}
          {route.tab === 'master' ? <MasterListPanel token={token} isAdmin={Boolean(user.is_admin)} setMessage={setMessage} /> : null}
        </main>
      </div>
    </div>
  )
}
