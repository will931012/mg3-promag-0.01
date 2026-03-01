import { requestJson } from './http'
import type { EorType } from '../app/eorTypes'
import type { AuthUser } from '../types/auth'
import type { AorRecord, DashboardSummary, EorRecord, ProjectRecord, RfiRecord, SubcontractorRecord, SubmittalRecord } from '../types/workspace'

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

export async function fetchAors(token: string): Promise<AorRecord[]> {
  const res = await requestJson<AorRecord[]>('/aors', { token })
  return res.ok && Array.isArray(res.data) ? res.data : []
}

export async function createAor(token: string, payload: { name: string }) {
  return requestJson<AorRecord>('/aors', { token, method: 'POST', body: payload })
}

export async function fetchEors(token: string, type?: EorType): Promise<EorRecord[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : ''
  const res = await requestJson<EorRecord[]>(`/eors${query}`, { token })
  return res.ok && Array.isArray(res.data) ? res.data : []
}

export async function createEor(token: string, payload: { type: EorType; name: string }) {
  return requestJson<EorRecord>('/eors', { token, method: 'POST', body: payload })
}

export async function fetchSubcontractors(token: string): Promise<SubcontractorRecord[]> {
  const res = await requestJson<SubcontractorRecord[]>('/subcontractors', { token })
  return res.ok && Array.isArray(res.data) ? res.data : []
}

export async function createSubcontractor(token: string, payload: { name: string }) {
  return requestJson<SubcontractorRecord>('/subcontractors', { token, method: 'POST', body: payload })
}

export async function fetchSubmittals(token: string): Promise<SubmittalRecord[]> {
  const res = await requestJson<SubmittalRecord[]>('/submittals', { token })
  return res.ok && Array.isArray(res.data) ? res.data : []
}

export async function createSubmittal(token: string, payload: Omit<SubmittalRecord, 'id'>) {
  return requestJson<SubmittalRecord>('/submittals', { token, method: 'POST', body: payload })
}

export async function updateSubmittal(token: string, id: number, payload: Omit<SubmittalRecord, 'id'>) {
  return requestJson<SubmittalRecord>(`/submittals/${id}`, { token, method: 'PUT', body: payload })
}

export async function deleteSubmittal(token: string, id: number) {
  return requestJson<null>(`/submittals/${id}`, { token, method: 'DELETE' })
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
