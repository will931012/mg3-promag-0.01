import { requestJson } from './http'
import type { ContactCategoryKey } from './projectContactsService'

// Shared parts of the per-project contact sheets: the roles/trades (rows of every sheet, stored in the
// database) and the contacts already used on any project (suggested when filling in another one).

export type ContactRole = { id: number; name: string }
export type ContactRoles = Record<ContactCategoryKey, ContactRole[]>

export type KnownContact = {
  id: number
  category: ContactCategoryKey
  role: string
  company: string
  contact: string
  email: string
  phone: string
}

export const emptyContactRoles: ContactRoles = { design_team: [], contractors: [] }

export async function fetchContactRoles(token: string): Promise<ContactRoles> {
  const res = await requestJson<ContactRoles>('/contacts/roles', { token })
  return res.ok && res.data ? res.data : emptyContactRoles
}

export async function fetchKnownContacts(token: string): Promise<KnownContact[]> {
  const res = await requestJson<KnownContact[]>('/contacts/known', { token })
  return res.ok && Array.isArray(res.data) ? res.data : []
}

/** Company names used on any project for a category (and role, when given), sorted and unique. */
export function knownCompanies(contacts: KnownContact[], category: ContactCategoryKey, role?: string): string[] {
  const names = contacts.filter((item) => item.category === category && item.company && (!role || item.role === role)).map((item) => item.company)
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
}
