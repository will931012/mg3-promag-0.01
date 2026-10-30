import { useEffect, useState } from 'react'

const STORAGE_KEY = 'promag_recent_projects'
const MAX_RECENT = 5

function readRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

/**
 * Ids of the projects opened most recently, newest first. Opening a project moves it to the top.
 */
export function useRecentProjects(openProjectId: string | null): string[] {
  const [recent, setRecent] = useState<string[]>(readRecent)

  useEffect(() => {
    if (!openProjectId) return
    setRecent((previous) => {
      if (previous[0] === openProjectId) return previous
      const next = [openProjectId, ...previous.filter((id) => id !== openProjectId)].slice(0, MAX_RECENT)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Recent projects are a convenience; ignore storage errors.
      }
      return next
    })
  }, [openProjectId])

  return recent
}
