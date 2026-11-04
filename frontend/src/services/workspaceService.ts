import { requestJson } from './http'
import type { AuthUser } from '../types/auth'
import type { DashboardSummary, ProjectRecord, RfiRecord } from '../types/workspace'

const emptySummary: DashboardSummary = {
  active_projects: 0,
  submittals_open: 0,
  submittals_late: 0,
  rfis_open: 0,
  rfis_overdue_open: 0,
}

export async function fetchSummary(token: string): Promise<DashboardSummary> {
  const res = await requestJson<DashboardSummary>('/dashboard/summary', { token })
  return res.ok && res.data ? { ...emptySummary, ...res.data } : emptySummary
}

export async function fetchProjects(token: string): Promise<ProjectRecord[]> {
  const res = await requestJson<ProjectRecord[]>('/projects', { token })
  return res.ok && Array.isArray(res.data) ? res.data : []
}

export async function createProject(token: string, payload: Omit<ProjectRecord, 'project_id'>) {
  return requestJson<ProjectRecord>('/projects', { token, method: 'POST', body: payload })
}

export async function updateProject(token: string, projectId: string, payload: Omit<ProjectRecord, 'project_id'>) {
  return requestJson<ProjectRecord>(`/projects/${encodeURIComponent(projectId)}`, { token, method: 'PUT', body: payload })
}

export async function deleteProject(token: string, projectId: string) {
  return requestJson<null>(`/projects/${encodeURIComponent(projectId)}`, { token, method: 'DELETE' })
}

export async function fetchRfis(token: string): Promise<RfiRecord[]> {
  const res = await requestJson<RfiRecord[]>('/rfis', { token })
  return res.ok && Array.isArray(res.data) ? res.data : []
}

export async function createRfi(token: string, payload: Omit<RfiRecord, 'id'>) {
  return requestJson<RfiRecord>('/rfis', { token, method: 'POST', body: payload })
}

export async function updateRfi(token: string, id: number, payload: Omit<RfiRecord, 'id'>) {
  return requestJson<RfiRecord>(`/rfis/${id}`, { token, method: 'PUT', body: payload })
}

export async function deleteRfi(token: string, id: number) {
  return requestJson<null>(`/rfis/${id}`, { token, method: 'DELETE' })
}

export async function fetchUsers(token: string): Promise<AuthUser[]> {
  const res = await requestJson<AuthUser[]>('/auth/users', { token })
  return res.ok && Array.isArray(res.data) ? res.data : []
}

export async function updateUserAdmin(token: string, id: number, isAdmin: boolean) {
  return requestJson<AuthUser>(`/auth/users/${id}/admin`, { token, method: 'PATCH', body: { is_admin: isAdmin } })
}
