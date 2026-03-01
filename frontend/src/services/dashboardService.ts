import type { DashboardSummary } from '../types/dashboard'
import { requestJson } from './http'

const emptySummary: DashboardSummary = {
  active_projects: 0,
  submittals_open: 0,
  submittals_late: 0,
  rfis_open: 0,
  rfis_overdue_open: 0,
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const res = await requestJson<DashboardSummary>('/dashboard/summary')
  if (!res.ok || !res.data) {
    return emptySummary
  }
  return {
    ...emptySummary,
    ...res.data,
  }
}
