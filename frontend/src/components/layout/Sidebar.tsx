import Icon from '../common/Icon'
import type { IconName } from '../common/Icon'

export type NavItem = {
  id: string
  label: string
  path: string
  icon: IconName
  badge?: number
  badgeLabel?: string
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

type SidebarProps = {
  groups: NavGroup[]
  activeId: string
  recentProjects: Array<{ id: string; name: string }>
  activeProjectId: string | null
  health: string
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapsed: () => void
  onCloseMobile: () => void
  onNavigate: (path: string) => void
}

const projectPath = (projectId: string) => `/projects/${encodeURIComponent(projectId)}`

export default function Sidebar({
  groups,
  activeId,
  recentProjects,
  activeProjectId,
  health,
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
  onNavigate,
}: SidebarProps) {
  // The mobile drawer always shows labels; the collapsed (icons only) mode is for wide screens.
  const compact = collapsed && !mobileOpen
  const go = (path: string) => {
    onNavigate(path)
    onCloseMobile()
  }

  return (
    <>
      {mobileOpen ? <button type="button" aria-label="Close menu" onClick={onCloseMobile} className="fixed inset-0 z-30 bg-black/40 md:hidden" /> : null}
      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-sidebar transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } ${compact ? 'md:w-[76px]' : 'md:w-64'}`}
      >
        <div className={`flex items-center gap-3 border-b border-line px-4 py-4 ${compact ? 'md:justify-center md:px-2' : ''}`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-sm font-bold text-white">MG3</span>
          <div className={`min-w-0 flex-1 ${compact ? 'md:hidden' : ''}`}>
            <p className="truncate text-sm font-semibold text-ink">ProMag</p>
            <p className="truncate text-xs text-ink-muted">Project Management</p>
          </div>
          <button type="button" onClick={onCloseMobile} aria-label="Close menu" className="rounded-lg p-1.5 text-ink-muted hover:bg-hover hover:text-ink md:hidden">
            <Icon name="close" />
          </button>
        </div>

        <nav className="ui-scroll flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className={`mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted ${compact ? 'md:sr-only' : ''}`}>{group.label}</p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = item.id === activeId
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => go(item.path)}
                        aria-current={active ? 'page' : undefined}
                        title={compact ? `${item.label}${item.badge ? ` (${item.badge} ${item.badgeLabel ?? ''})` : ''}` : undefined}
                        className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${compact ? 'md:justify-center md:px-0' : ''} ${
                          active ? 'bg-nav-active font-semibold text-nav-active-ink' : 'text-ink-muted hover:bg-hover hover:text-ink'
                        }`}
                      >
                        <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                        <span className={`flex-1 truncate ${compact ? 'md:hidden' : ''}`}>{item.label}</span>
                        {item.badge ? (
                          <span
                            className={`rounded-full bg-rose-600 px-1.5 text-[11px] font-bold leading-5 text-white ${
                              compact ? 'md:absolute md:right-2 md:top-1 md:h-2.5 md:w-2.5 md:p-0 md:text-[0px]' : ''
                            }`}
                            aria-label={`${item.badge} ${item.badgeLabel ?? ''}`}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}

          {recentProjects.length && !compact ? (
            <div className="mb-5">
              <p className="mb-1.5 flex items-center gap-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                <Icon name="recent" className="h-3.5 w-3.5" />
                Recent projects
              </p>
              <ul className="space-y-0.5">
                {recentProjects.map((project) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      onClick={() => go(projectPath(project.id))}
                      aria-current={project.id === activeProjectId ? 'page' : undefined}
                      className={`w-full truncate rounded-lg px-3 py-1.5 text-left text-sm transition ${
                        project.id === activeProjectId ? 'bg-hover font-semibold text-ink' : 'text-ink-muted hover:bg-hover hover:text-ink'
                      }`}
                    >
                      {project.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </nav>

        <div className={`flex items-center gap-2 border-t border-line px-4 py-3 ${compact ? 'md:flex-col md:px-2' : ''}`}>
          <span className={`flex min-w-0 flex-1 items-center gap-2 text-xs text-ink-muted ${compact ? 'md:justify-center' : ''}`} title={`API: ${health}`}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${health === 'ok' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
            <span className={`truncate ${compact ? 'md:hidden' : ''}`}>API {health === 'ok' ? 'connected' : health}</span>
          </span>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden rounded-lg p-1.5 text-ink-muted hover:bg-hover hover:text-ink md:block"
          >
            <Icon name={collapsed ? 'expand' : 'collapse'} />
          </button>
        </div>
      </aside>
    </>
  )
}
