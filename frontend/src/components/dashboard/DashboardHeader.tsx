import type { AuthUser } from '../../types/auth'

type DashboardHeaderProps = {
  health: string
  user: AuthUser
  onLogout: () => void
}

export default function DashboardHeader({ health, user, onLogout }: DashboardHeaderProps) {
  return (
    <header className="rounded-2xl bg-[linear-gradient(135deg,#1f63b1,#214876)] p-7 text-white shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-100">MG3 Group</p>
      <h1 className="mt-2 text-4xl font-semibold">ProMag</h1>
      <p className="mt-1 text-brand-100">Project portfolio and site execution control.</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">API: {health}</span>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{user.username}</span>
        <button
          onClick={onLogout}
          className="rounded-full border border-white/35 px-3 py-1 text-xs font-semibold transition hover:bg-white/10"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
