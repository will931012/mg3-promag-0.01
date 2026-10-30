import { useTheme } from '../app/theme'
import LoginForm from '../components/auth/LoginForm'
import Icon from '../components/common/Icon'

type LoginPageProps = {
  health: string
  username: string
  password: string
  loginError: string
  loggingIn: boolean
  onUsernameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

export default function LoginPage(props: LoginPageProps) {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'night' ? 'day' : 'night'
  return (
    <div className="relative min-h-screen overflow-hidden bg-hero">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${nextTheme} theme`}
        title={`Switch to ${nextTheme} theme`}
        className="absolute right-4 top-4 z-10 rounded-lg border border-line bg-surface/70 p-2 text-ink-soft backdrop-blur hover:bg-surface"
      >
        <Icon name={theme === 'night' ? 'sun' : 'moon'} />
      </button>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,153,238,0.30),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.20),transparent_45%)]" />
      <main className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-8 p-6 lg:grid-cols-2">
        <section className="hidden text-hero-ink lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">MG3 Group</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">ProMag Workspace Control</h1>
          <p className="mt-4 max-w-md text-hero-muted">
            Manage sites, teams, budgets, and schedules in one command center tailored for MG3 projects.
          </p>
        </section>

        <LoginForm {...props} />
      </main>
    </div>
  )
}
