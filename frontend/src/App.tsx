import { FormEvent, useEffect, useState } from 'react'

type Project = {
  id: number
  name: string
  location: string
  client: string
  budget: string
  start_date: string
  end_date: string
  progress: number
  status: 'planning' | 'active' | 'at_risk' | 'done'
}

type AuthUser = {
  id: number
  username: string
  email: string
}

const API_BASE = 'http://127.0.0.1:8000/api'
const TOKEN_KEY = 'promag_token'

const statusStyles: Record<Project['status'], string> = {
  planning: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  at_risk: 'bg-rose-100 text-rose-800',
  done: 'bg-brand-100 text-brand-800',
}

function statusLabel(status: Project['status']) {
  if (status === 'at_risk') return 'At Risk'
  if (status === 'done') return 'Completed'
  if (status === 'active') return 'Active'
  return 'Planning'
}

export default function App() {
  const [booting, setBooting] = useState(true)
  const [health, setHealth] = useState('checking...')
  const [projects, setProjects] = useState<Project[]>([])
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    const bootstrap = async () => {
      const minDelay = new Promise((resolve) => setTimeout(resolve, 1200))

      try {
        const healthRes = await fetch(`${API_BASE}/health/`)
        const healthData = await healthRes.json()
        setHealth(healthData.status ?? 'offline')
      } catch {
        setHealth('offline')
      }

      const savedToken = localStorage.getItem(TOKEN_KEY)
      if (savedToken) {
        try {
          const meRes = await fetch(`${API_BASE}/auth/me/`, {
            headers: { Authorization: `Token ${savedToken}` },
          })

          if (meRes.ok) {
            const meData = await meRes.json()
            setToken(savedToken)
            setUser(meData.user)
            await fetchProjects(savedToken)
          } else {
            localStorage.removeItem(TOKEN_KEY)
          }
        } catch {
          localStorage.removeItem(TOKEN_KEY)
        }
      }

      await minDelay
      setBooting(false)
    }

    void bootstrap()
  }, [])

  const fetchProjects = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/projects/`, {
        headers: { Authorization: `Token ${authToken}` },
      })

      if (!res.ok) {
        setProjects([])
        return
      }

      const data = await res.json()
      setProjects(Array.isArray(data) ? data : [])
    } catch {
      setProjects([])
    }
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError('')
    setLoggingIn(true)

    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        setLoginError(data.detail ?? 'Login failed')
        return
      }

      localStorage.setItem(TOKEN_KEY, data.token)
      setToken(data.token)
      setUser(data.user)
      setUsername('')
      setPassword('')
      await fetchProjects(data.token)
    } catch {
      setLoginError('Unable to reach API server.')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout/`, {
          method: 'POST',
          headers: { Authorization: `Token ${token}` },
        })
      } catch {
        // Clear local state even if API logout fails.
      }
    }

    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setProjects([])
  }

  if (booting) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,153,238,0.30),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(16,185,129,0.24),transparent_40%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 text-white backdrop-blur-xl shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-100">MG3 Group</p>
            <h1 className="mt-3 text-4xl font-semibold">ProMag</h1>
            <p className="mt-2 text-sm text-slate-200">Preparing your workspace...</p>
            <div className="mt-6 h-2 rounded-full bg-white/20">
              <div className="h-full rounded-full bg-[linear-gradient(120deg,#93d3fb_8%,#dbeefe_18%,#93d3fb_33%)] bg-[length:200%_100%] animate-shimmer" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,153,238,0.30),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.20),transparent_45%)]" />
        <main className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-8 p-6 lg:grid-cols-2">
          <section className="hidden text-white lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-100">MG3 Group</p>
            <h1 className="mt-4 text-5xl font-semibold leading-tight">ProMag Workspace Control</h1>
            <p className="mt-4 max-w-md text-slate-200">
              Manage sites, teams, budgets, and schedules in one command center tailored for MG3 projects.
            </p>
          </section>

          <form
            onSubmit={handleLogin}
            className="w-full rounded-2xl border border-white/20 bg-white p-8 shadow-soft backdrop-blur"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">MG3 Group</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">Sign in to ProMag</h2>
            <p className="mt-2 text-sm text-slate-500">Use your Django user credentials.</p>

            <div className="mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ring-slate-200">
              API:
              <span className={`ml-1 ${health === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>{health}</span>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Username
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
              </label>
            </div>

            {loginError ? <p className="mt-3 text-sm font-medium text-rose-700">{loginError}</p> : null}

            <button
              type="submit"
              disabled={loggingIn || health !== 'ok'}
              className="mt-6 w-full rounded-xl bg-brand-700 px-4 py-2.5 font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loggingIn ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl p-6">
        <header className="rounded-2xl bg-[linear-gradient(135deg,#1f63b1,#214876)] p-7 text-white shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-100">MG3 Group</p>
          <h1 className="mt-2 text-4xl font-semibold">ProMag</h1>
          <p className="mt-1 text-brand-100">Project portfolio and site execution control.</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">API: {health}</span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{user.username}</span>
            <button
              onClick={handleLogout}
              className="rounded-full border border-white/35 px-3 py-1 text-xs font-semibold transition hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {projects.length} total
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <p className="text-slate-700">No projects yet. Create one in Django admin.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <article key={p.id} className="rounded-xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{p.name}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[p.status]}`}>
                      {statusLabel(p.status)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-700">{p.location}</p>
                  <p className="mt-1 text-sm text-slate-500">Client: {p.client}</p>
                  <p className="mt-1 text-sm text-slate-500">Budget: ${Number(p.budget).toLocaleString()}</p>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                      <span>Progress</span>
                      <span>{p.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${Math.max(0, Math.min(100, p.progress))}%` }}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
