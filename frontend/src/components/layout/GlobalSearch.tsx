import { useEffect, useRef, useState } from 'react'

import Icon from '../common/Icon'

export type SearchResult = {
  id: string
  type: string
  title: string
  subtitle: string
  path: string
}

type GlobalSearchProps = {
  query: string
  results: SearchResult[]
  onQueryChange: (query: string) => void
  onSelect: (result: SearchResult) => void
}

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/**
 * Workspace search. Ctrl/Cmd+K or "/" focuses it from anywhere; arrow keys move through results.
 */
export default function GlobalSearch({ query, results, onQueryChange, onSelect }: GlobalSearchProps) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = (event.key === 'k' || event.key === 'K') && (event.ctrlKey || event.metaKey)
      if (shortcut || (event.key === '/' && !isTypingTarget(event.target))) {
        event.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  useEffect(() => {
    setHighlighted(0)
  }, [query])

  const choose = (result: SearchResult) => {
    onSelect(result)
    setOpen(false)
    inputRef.current?.blur()
  }

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setHighlighted((index) => (index + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((index) => (index - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(results[Math.min(highlighted, results.length - 1)])
    }
  }

  const showResults = open && query.trim().length > 0

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        ref={inputRef}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onQueryChange(event.target.value)
          setOpen(true)
        }}
        onKeyDown={onInputKeyDown}
        role="combobox"
        aria-expanded={showResults}
        aria-controls="workspace-search-results"
        aria-activedescendant={showResults && results[highlighted] ? `search-result-${results[highlighted].id}` : undefined}
        aria-label="Search projects, submittals and RFIs"
        placeholder="Search projects, submittals, RFIs…"
        className="w-full rounded-lg border border-line bg-raised py-2 pl-9 pr-16 text-sm text-ink placeholder:text-ink-muted"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted sm:block">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
      {showResults ? (
        <ul
          id="workspace-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[60vh] overflow-y-auto rounded-xl border border-line bg-surface p-2 shadow-2xl"
        >
          {results.length ? (
            results.map((item, index) => (
              <li
                key={item.id}
                id={`search-result-${item.id}`}
                role="option"
                aria-selected={index === highlighted}
                onMouseEnter={() => setHighlighted(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
                className={`flex cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2 ${index === highlighted ? 'bg-hover' : ''}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                  <p className="truncate text-xs text-ink-muted">{item.subtitle}</p>
                </div>
                <span className="shrink-0 rounded-full bg-raised px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-accent">{item.type}</span>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-ink-muted">No results for “{query.trim()}”.</li>
          )}
        </ul>
      ) : null}
    </div>
  )
}
