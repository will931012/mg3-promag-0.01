import LoginForm from '../components/auth/LoginForm'

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

        <LoginForm {...props} />
      </main>
    </div>
  )
}
