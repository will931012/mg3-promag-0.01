import { useCallback, useEffect, useState } from 'react'

export type Theme = 'day' | 'night'

// Must match the key read by the script in index.html.
const STORAGE_KEY = 'promag_theme'

const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)')

const systemTheme = (): Theme => (darkQuery()?.matches ? 'night' : 'day')

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'day' || value === 'night' ? value : null
  } catch {
    return null
  }
}

function currentTheme(): Theme {
  const applied = document.documentElement.dataset.theme
  if (applied === 'day' || applied === 'night') return applied
  return savedTheme() ?? systemTheme()
}

/**
 * Day/night theme. Follows the system setting until the user picks one, then remembers the choice.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(currentTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const media = darkQuery()
    if (!media) return
    const onChange = () => {
      if (!savedTheme()) setThemeState(media.matches ? 'night' : 'day')
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((previous) => {
      const next: Theme = previous === 'night' ? 'day' : 'night'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // The theme still changes for this visit.
      }
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
