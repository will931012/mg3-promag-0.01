type LoginFormProps = {
  username: string
  password: string
  health: string
  loginError: string
  loggingIn: boolean
  onUsernameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

export default function LoginForm({
  username,
  password,
  health,
  loginError,
  loggingIn,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="w-full rounded-2xl border border-white/20 bg-white p-8 shadow-soft backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">MG3 Group</p>
      <h2 className="mt-3 text-3xl font-semibold text-slate-900">Sign in to ProMag</h2>
      <p className="mt-2 text-sm text-slate-500">Use your ProMag workspace credentials.</p>

      <div className="mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ring-slate-200">
        API:
        <span className={`ml-1 ${health === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>{health}</span>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Username
          <input
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
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
            onChange={(e) => onPasswordChange(e.target.value)}
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
  )
}
