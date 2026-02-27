const rawApiBase = import.meta.env.VITE_API_BASE?.trim()

const normalizeApiBase = (value: string | undefined) => {
  const fallback = 'http://127.0.0.1:4000/api'
  let base = value && value.length > 0 ? value : fallback

  // If env value is "/my-api.example.com", treat it as a host, not a relative path.
  if (base.startsWith('/')) {
    const trimmed = base.replace(/^\/+/, '')
    if (/^[a-z0-9.-]+\.[a-z]{2,}([/:].*)?$/i.test(trimmed)) {
      base = trimmed
    }
  }

  if (!/^https?:\/\//i.test(base) && !base.startsWith('/')) {
    base = `https://${base}`
  }

  base = base.replace(/\/+$/, '')

  if (/^https?:\/\//i.test(base)) {
    try {
      const url = new URL(base)
      if (url.pathname === '/' || url.pathname === '') {
        return `${url.origin}/api`
      }
      return base
    } catch {
      return fallback
    }
  }

  return base
}

export const API_BASE = normalizeApiBase(rawApiBase)
export const TOKEN_KEY = 'promag_token'
