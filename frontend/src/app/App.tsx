import { FormEvent, useEffect, useState } from 'react'

import { TOKEN_KEY } from './config'
import LoadingScreen from '../components/common/LoadingScreen'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import { getCurrentUser, getHealth, login, logout } from '../services/authService'
import { getProjects } from '../services/projectService'
import type { AuthUser } from '../types/auth'
import type { Project } from '../types/project'

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
        setHealth(await getHealth())
      } catch {
        setHealth('offline')
      }

      const savedToken = localStorage.getItem(TOKEN_KEY)
      if (savedToken) {
        try {
          const meResponse = await getCurrentUser(savedToken)
          if (meResponse.ok && meResponse.data) {
            setToken(savedToken)
            setUser(meResponse.data.user)
            setProjects(await getProjects(savedToken))
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
      setUsername('')
      setPassword('')
      setProjects(await getProjects(response.data.token))
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
        // Clear local auth state even if request fails.
      }
    }

    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setProjects([])
  }

  if (booting) {
    return <LoadingScreen />
  }

  if (!user) {
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

  return <DashboardPage user={user} health={health} projects={projects} onLogout={handleLogout} />
}
