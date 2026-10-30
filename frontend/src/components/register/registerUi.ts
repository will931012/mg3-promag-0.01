// Colors follow the legend on the HOW TO USE tab of Shop Drawing Log.xlsx:
// green = closed/approved, amber = ball with subcontractor / long-lead / at AHJ,
// light blue = ball with GC, red = alert / rejected / revise & resubmit, grey = superseded.

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const APPROVED_CODES = new Set(['Approved', 'Approved as Noted', 'For Record Only'])

export function statusTone(status: string): Tone {
  if (APPROVED_CODES.has(status)) return 'success'
  if (status === 'Revise & Resubmit' || status === 'Rejected') return 'danger'
  if (status === 'In review') return 'info'
  return 'neutral'
}

export function ballTone(ball: string): Tone {
  if (ball === 'Closed') return 'success'
  if (ball === 'Subcontractor') return 'warning'
  if (ball === 'GC') return 'info'
  return 'neutral'
}

export function alertTone(alert: string): Tone {
  return alert === 'AT AHJ — PENDING' ? 'warning' : 'danger'
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const [year, month, day] = value.slice(0, 10).split('-')
  return year && month && day ? `${month}/${day}/${year}` : value
}

export const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-900'
export const cellInputClass = 'w-full min-w-[7rem] rounded border border-slate-300 bg-surface px-2 py-1 text-sm text-slate-900'
