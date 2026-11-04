import { requestJson } from './http'

// Project contacts follow the contacts sheet: design team / reviewers, then GC and subcontractors.

export type ContactCategoryKey = 'design_team' | 'contractors'

export type ProjectContactFields = {
  company: string
  contact: string
  email: string
  phone: string
  notes: string
}

export type ProjectContactRow = ProjectContactFields & {
  id: number | null // null until someone fills the row in
  role: string
  custom: boolean // a role/trade that isn't on the standard list
}

export type ProjectContactCategory = {
  key: ContactCategoryKey
  title: string
  rows: ProjectContactRow[]
}

export type ProjectContactSheet = {
  project_id: string
  categories: ProjectContactCategory[]
}

const base = (projectId: string) => `/project-contacts/${encodeURIComponent(projectId)}`

export async function fetchProjectContacts(token: string, projectId: string) {
  return requestJson<ProjectContactSheet>(base(projectId), { token })
}

export async function saveProjectContact(token: string, projectId: string, payload: ProjectContactFields & { category: ContactCategoryKey; role: string }) {
  return requestJson<ProjectContactRow>(base(projectId), { token, method: 'PUT', body: payload })
}

export async function deleteProjectContact(token: string, projectId: string, id: number) {
  return requestJson<null>(`${base(projectId)}/${id}`, { token, method: 'DELETE' })
}
