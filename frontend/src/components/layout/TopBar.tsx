import { useEffect, useRef, useState } from 'react'

import Icon from '../common/Icon'
import GlobalSearch from './GlobalSearch'
import type { SearchResult } from './GlobalSearch'
import type { Theme } from '../../app/theme'
import type { AuthUser } from '../../types/auth'

type TopBarProps = {
  title: string
  subtitle?: string
  user: AuthUser
  theme: Theme
  searchQuery: string
  searchResults: SearchResult[]
  onSearchQueryChange: (query: string) => void
  onSearchSelect: (result: SearchResult) => void
  onToggleTheme: () => void
  onOpenMenu: () => void
  onLogout: () => void
}

const initials = (user: AuthUser) =>
  (user.full_name || user.username)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

export default function TopBar({
  title,
  subtitle,
  user,
  theme,
  searchQuery,
  searchResults,
  onSearchQueryChange,
  onSearchSelect,
  onToggleTheme,
  onOpenMenu,
  onLogout,
}: TopBarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!userMenuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [userMenuOpen])

  const nextTheme = theme === 'night' ? 'day' : 'night'

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-main/90 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <button type="button" onClick={onOpenMenu} aria-label="Open menu" className="rounded-lg border border-line p-2 text-ink-soft hover:bg-hover md:hidden">
          <Icon name="menu" />
        </button>
        <div className="min-w-0 flex-1 md:flex-none md:basis-56">
          <h1 className="truncate text-lg font-semibold text-ink">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-ink-muted">{subtitle}</p> : null}
        </div>

        <div className="order-last flex w-full md:order-none md:w-auto md:flex-1 md:justify-center">
          <div className="flex w-full max-w-xl">
            <GlobalSearch query={searchQuery} results={searchResults} onQueryChange={onSearchQueryChange} onSelect={onSearchSelect} />
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${nextTheme} theme`}
          title={`Switch to ${nextTheme} theme`}
          className="rounded-lg border border-line p-2 text-ink-soft hover:bg-hover hover:text-ink"
        >
          <Icon name={theme === 'night' ? 'sun' : 'moon'} />
        </button>

        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            className="flex items-center gap-2 rounded-lg border border-line py-1 pl-1 pr-2 text-sm text-ink-soft hover:bg-hover"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-700 text-xs font-bold text-white">{initials(user)}</span>
            <span className="hidden max-w-[10rem] truncate sm:inline">{user.username}</span>
          </button>
          {userMenuOpen ? (
            <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 rounded-xl border border-line bg-surface p-2 shadow-2xl">
              <div className="border-b border-line px-3 pb-2 pt-1">
                <p className="truncate text-sm font-semibold text-ink">{user.full_name || user.username}</p>
                <p className="truncate text-xs text-ink-muted">{user.email || user.username}</p>
                <p className="mt-1 text-xs text-ink-muted">{user.is_admin ? 'Admin' : 'User'}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-soft hover:bg-hover hover:text-ink"
              >
                <Icon name="logout" className="h-4 w-4" />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
