import { requestJson } from './http'
import type { ContactCategoryKey, ProjectContactFields } from './projectContactsService'

// Contacts directory: same layout as the contacts sheet, roles stored in the database.

export type ContactRole = { id: number; name: string }
export type ContactRoles = Record<ContactCategoryKey, ContactRole[]>

export type DirectoryContact = ProjectContactFields & {
  id: number
  category: ContactCategoryKey
  role: string
}

export type DirectoryContactInput = Omit<DirectoryContact, 'id'>

export const CONTACT_CATEGORY_TITLES: Record<ContactCategoryKey, string> = {
  design_team: 'Design team / reviewers',
  contractors: 'General contractor and subcontractors',
}

export const CONTACT_ROLE_LABELS: Record<ContactCategoryKey, string> = {
  design_team: 'Role',
  contractors: 'Discipline / trade',
}

export const emptyContactRoles: ContactRoles = { design_team: [], contractors: [] }

export async function fetchContactRoles(token: string): Promise<ContactRoles> {
  const res = await requestJson<ContactRoles>('/contacts/roles', { token })
  return res.ok && res.data ? res.data : emptyContactRoles
}

export async function deleteContactRole(token: string, id: number) {
  return requestJson<ContactRoles>(`/contacts/roles/${id}`, { token, method: 'DELETE' })
}

export async function fetchDirectoryContacts(token: string): Promise<DirectoryContact[]> {
  const res = await requestJson<DirectoryContact[]>('/contacts', { token })
  return res.ok && Array.isArray(res.data) ? res.data : []
}

export async function createDirectoryContact(token: string, payload: DirectoryContactInput) {
  return requestJson<DirectoryContact>('/contacts', { token, method: 'POST', body: payload })
}

export async function updateDirectoryContact(token: string, id: number, payload: DirectoryContactInput) {
  return requestJson<DirectoryContact>(`/contacts/${id}`, { token, method: 'PUT', body: payload })
}

export async function deleteDirectoryContact(token: string, id: number) {
  return requestJson<null>(`/contacts/${id}`, { token, method: 'DELETE' })
}
