import { FormEvent, useEffect, useState } from 'react'

import { TOKEN_KEY } from './config'
import LoadingScreen from '../components/common/LoadingScreen'
import LoginPage from '../pages/LoginPage'
import WorkspacePage from '../pages/WorkspacePage'
import { getCurrentUser, getHealth, login, logout } from '../services/authService'
import {
  fetchProjects,
  fetchRfis,
  fetchSubmittals,
  fetchSummary,
  fetchUsers,
} from '../services/workspaceService'
import type { AuthUser } from '../types/auth'
import type { DashboardSummary, ProjectRecord, RfiRecord, SubmittalRecord } from '../types/workspace'

const emptySummary: DashboardSummary = {
  active_projects: 0,
  submittals_open: 0,
  submittals_late: 0,
  rfis_open: 0,
  rfis_overdue_open: 0,
}

export default function App() {
  const [booting, setBooting] = useState(true)
  const [health, setHealth] = useState('checking...')
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary)
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [submittals, setSubmittals] = useState<SubmittalRecord[]>([])
  const [rfis, setRfis] = useState<RfiRecord[]>([])
  const [users, setUsers] = useState<AuthUser[]>([])
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [message, setMessage] = useState('')

  const refreshWorkspace = async (authToken: string) => {
    const [nextSummary, nextProjects, nextSubmittals, nextRfis, nextUsers] = await Promise.all([
      fetchSummary(authToken),
      fetchProjects(authToken),
      fetchSubmittals(authToken),
      fetchRfis(authToken),
      fetchUsers(authToken),
    ])
    setSummary(nextSummary)
    setProjects(nextProjects)
    setSubmittals(nextSubmittals)
    setRfis(nextRfis)
    setUsers(nextUsers)
  }

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setHealth(await getHealth())
      } catch {
        setHealth('offline')
      }

      const savedToken = localStorage.getItem(TOKEN_KEY)
      if (savedToken) {
        try {
          const meResponse = await getCurrentUser(savedToken)
          if (meResponse.ok && meResponse.data?.user) {
            setToken(savedToken)
            setUser(meResponse.data.user)
            await refreshWorkspace(savedToken)
          } else {
            localStorage.removeItem(TOKEN_KEY)
          }
        } catch {
          localStorage.removeItem(TOKEN_KEY)
        }
      }

      setBooting(false)
    }

    void bootstrap()
  }, [])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError('')
    setLoggingIn(true)

    try {
      const response = await login(username, password)
      if (!response.ok || !response.data || !('token' in response.data)) {
        const detail = response.data && 'detail' in response.data ? response.data.detail : null
        setLoginError(detail ?? 'Login failed')
        return
      }

      localStorage.setItem(TOKEN_KEY, response.data.token)
      setToken(response.data.token)
      setUser(response.data.user)
      await refreshWorkspace(response.data.token)
      setUsername('')
      setPassword('')
      setMessage('')
    } catch {
      setLoginError('Unable to reach API server.')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    if (token) {
      try {
        await logout(token)
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setProjects([])
    setSubmittals([])
    setRfis([])
    setUsers([])
    setSummary(emptySummary)
  }

  if (booting) {
    return <LoadingScreen />
  }

  if (!user || !token) {
    return (
      <LoginPage
        health={health}
        username={username}
        password={password}
        loginError={loginError}
        loggingIn={loggingIn}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
    )
  }

  return (
    <WorkspacePage
      health={health}
      user={user}
      token={token}
      summary={summary}
      projects={projects}
      submittals={submittals}
      rfis={rfis}
      users={users}
      message={message}
      setMessage={setMessage}
      onLogout={handleLogout}
      refreshWorkspace={refreshWorkspace}
    />
  )
}
