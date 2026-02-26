export default function LoadingScreen() {
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
