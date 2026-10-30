import { requestJson } from './http'
import type {
  LogEntryFields,
  MasterItem,
  ProjectItemFields,
  ProjectRegister,
  RegisterActivity,
  RegisterItem,
  RegisterItemFields,
  RegisterMeta,
} from '../types/register'

export const emptyRegisterActivity: RegisterActivity = {
  submittals_open: 0,
  submittals_late: 0,
  alerts: 0,
  items: [],
  attention: [],
}

export async function fetchRegisterMeta(token: string) {
  return requestJson<RegisterMeta>('/register/meta', { token })
}

export async function fetchRegisterActivity(token: string): Promise<RegisterActivity> {
  const res = await requestJson<RegisterActivity>('/register/activity', { token })
  return res.ok && res.data ? res.data : emptyRegisterActivity
}

export async function fetchProjectRegister(token: string, projectId: string) {
  return requestJson<ProjectRegister>(`/register/projects/${encodeURIComponent(projectId)}`, { token })
}

export async function updateReviewDays(token: string, projectId: string, reviewDays: number) {
  return requestJson<ProjectRegister['project']>(`/register/projects/${encodeURIComponent(projectId)}/settings`, {
    token,
    method: 'PATCH',
    body: { review_days: reviewDays },
  })
}

export async function createRegisterItem(token: string, projectId: string, payload: Partial<ProjectItemFields>) {
  return requestJson<RegisterItem>(`/register/projects/${encodeURIComponent(projectId)}/items`, { token, method: 'POST', body: payload })
}

export async function updateRegisterItem(token: string, id: number, payload: Partial<ProjectItemFields>) {
  return requestJson<RegisterItem>(`/register/items/${id}`, { token, method: 'PATCH', body: payload })
}

export async function deleteRegisterItem(token: string, id: number) {
  return requestJson<null>(`/register/items/${id}`, { token, method: 'DELETE' })
}

export async function createLogEntry(token: string, itemId: number, payload: Partial<LogEntryFields>) {
  return requestJson<RegisterItem>(`/register/items/${itemId}/log`, { token, method: 'POST', body: payload })
}

export async function updateLogEntry(token: string, id: number, payload: Partial<LogEntryFields>) {
  return requestJson<RegisterItem>(`/register/log/${id}`, { token, method: 'PATCH', body: payload })
}

export async function deleteLogEntry(token: string, id: number) {
  return requestJson<RegisterItem>(`/register/log/${id}`, { token, method: 'DELETE' })
}

export async function fetchMasterItems(token: string): Promise<MasterItem[]> {
  const res = await requestJson<MasterItem[]>('/register/master', { token })
  return res.ok && Array.isArray(res.data) ? res.data : []
}

export async function createMasterItem(token: string, payload: Partial<RegisterItemFields> & { seen_on?: string }) {
  return requestJson<MasterItem>('/register/master', { token, method: 'POST', body: payload })
}

export async function updateMasterItem(token: string, id: number, payload: Partial<MasterItem>) {
  return requestJson<MasterItem>(`/register/master/${id}`, { token, method: 'PATCH', body: payload })
}

export function responseDetail(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'detail' in data && typeof (data as { detail: unknown }).detail === 'string') {
    return (data as { detail: string }).detail
  }
  return fallback
}
