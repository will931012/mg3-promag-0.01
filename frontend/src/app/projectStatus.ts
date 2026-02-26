import type { ProjectStatus } from '../types/project'

export const statusStyles: Record<ProjectStatus, string> = {
  planning: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  at_risk: 'bg-rose-100 text-rose-800',
  done: 'bg-brand-100 text-brand-800',
}

export function statusLabel(status: ProjectStatus): string {
  if (status === 'at_risk') return 'At Risk'
  if (status === 'done') return 'Completed'
  if (status === 'active') return 'Active'
  return 'Planning'
}
