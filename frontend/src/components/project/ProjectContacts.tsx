import { FormEvent, useEffect, useMemo, useState } from 'react'

import PrimaryButton from '../common/PrimaryButton'
import { cellInputClass } from '../register/registerUi'
import { fetchKnownContacts } from '../../services/contactsService'
import type { KnownContact } from '../../services/contactsService'
import { responseDetail } from '../../services/registerService'
import {
  deleteProjectContact,
  fetchProjectContacts,
  saveProjectContact,
} from '../../services/projectContactsService'
import type { ContactCategoryKey, ProjectContactCategory, ProjectContactFields, ProjectContactRow } from '../../services/projectContactsService'

type ProjectContactsProps = {
  token: string
  projectId: string
  setMessage: (message: string) => void
  // On the Contacts page (and inside the contacts window) the sheet is shown on its own, always open.
  sheetOnly?: boolean
  // Opens the contacts window (owned by the project page, next to the Submittals / RFIs buttons).
  onOpenWindow?: () => void
  // Bump to reload the strip, e.g. after the contacts window closes.
  reloadKey?: number
}

const FIELDS: Array<{ key: keyof ProjectContactFields; label: string; type?: string }> = [
  { key: 'company', label: 'Company' },
  { key: 'contact', label: 'Contact' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'notes', label: 'Notes' },
]

const emptyFields: ProjectContactFields = { company: '', contact: '', email: '', phone: '', notes: '' }
const isFilled = (row: ProjectContactRow) => Boolean(row.company || row.contact || row.email || row.phone)
const pickFields = (row: ProjectContactRow): ProjectContactFields => ({
  company: row.company,
  contact: row.contact,
  email: row.email,
  phone: row.phone,
  notes: row.notes,
})

/**
 * Contacts for one project: a compact strip with the people already filled in, and the full sheet
 * (design team / reviewers + general contractor and subcontractors) to edit. Every project has its own sheet;
 * the rows are the roles/trades stored in the database, and companies used on other projects are suggested.
 */
export default function ProjectContacts({ token, projectId, setMessage, sheetOnly = false, onOpenWindow, reloadKey = 0 }: ProjectContactsProps) {
  const [categories, setCategories] = useState<ProjectContactCategory[]>([])
  const [loading, setLoading] = useState(true)
  const open = sheetOnly
  const [editing, setEditing] = useState<{ category: ContactCategoryKey; role: string } | null>(null)
  const [draft, setDraft] = useState<ProjectContactFields>(emptyFields)
  const [saving, setSaving] = useState(false)
  const [newRole, setNewRole] = useState<{ category: ContactCategoryKey; role: string } | null>(null)

  const [known, setKnown] = useState<KnownContact[]>([])

  useEffect(() => {
    let cancelled = false
    void fetchKnownContacts(token).then((rows) => {
      if (!cancelled) setKnown(rows)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  // Contacts used on other projects for a row: the same role first, otherwise the rest of the group.
  const knownOptions = (category: ContactCategoryKey, role: string) => {
    const inCategory = known.filter((item) => item.category === category && item.company)
    const sameRole = inCategory.filter((item) => item.role === role)
    return sameRole.length ? sameRole : inCategory
  }

  const setCompany = (category: ContactCategoryKey, role: string, company: string) => {
    const match = knownOptions(category, role).find((item) => item.company === company)
    setDraft((prev) =>
      match && !prev.contact && !prev.email && !prev.phone
        ? { ...prev, company, contact: match.contact, email: match.email, phone: match.phone }
        : { ...prev, company }
    )
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchProjectContacts(token, projectId).then((res) => {
      if (cancelled) return
      setCategories(res.ok && res.data ? res.data.categories : [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [token, projectId, reloadKey])

  const filled = useMemo(
    () => categories.flatMap((category) => category.rows.filter(isFilled).map((row) => ({ ...row, category: category.key }))),
    [categories]
  )

  const replaceRow = (category: ContactCategoryKey, role: string, next: ProjectContactRow | null) =>
    setCategories((prev) =>
      prev.map((item) => {
        if (item.key !== category) return item
        const exists = item.rows.some((row) => row.role === role)
        if (!next) return { ...item, rows: item.rows.filter((row) => row.role !== role) }
        return { ...item, rows: exists ? item.rows.map((row) => (row.role === role ? next : row)) : [...item.rows, next] }
      })
    )

  const startEdit = (category: ContactCategoryKey, row: ProjectContactRow) => {
    setEditing({ category, role: row.role })
    setDraft(pickFields(row))
  }

  const save = async (category: ContactCategoryKey, role: string) => {
    setSaving(true)
    const res = await saveProjectContact(token, projectId, { category, role, ...draft })
    setSaving(false)
    if (!res.ok || !res.data) return setMessage(responseDetail(res.data, 'Failed to save contact.'))
    replaceRow(category, role, res.data)
    setEditing(null)
    setMessage(`Saved ${role} contact.`)
  }

  const clear = async (category: ContactCategoryKey, row: ProjectContactRow) => {
    if (row.id === null) return
    if (!confirm(row.custom ? `Remove ${row.role} from this project?` : `Clear the ${row.role} contact?`)) return
    const res = await deleteProjectContact(token, projectId, row.id)
    if (!res.ok) return setMessage(responseDetail(res.data, 'Failed to remove contact.'))
    replaceRow(category, row.role, row.custom ? null : { ...row, ...emptyFields, id: null })
    setMessage(row.custom ? `Removed ${row.role}.` : `Cleared ${row.role} contact.`)
  }

  const addRole = (event: FormEvent) => {
    event.preventDefault()
    if (!newRole) return
    const role = newRole.role.trim()
    if (!role) return
    const category = categories.find((item) => item.key === newRole.category)
    if (category?.rows.some((row) => row.role.toLowerCase() === role.toLowerCase())) return setMessage(`${role} is already on the list.`)
    // Saved with the first contact; from then on the role is a row on every project's sheet.
    replaceRow(newRole.category, role, { id: null, role, custom: true, ...emptyFields })
    setEditing({ category: newRole.category, role })
    setDraft(emptyFields)
    setNewRole(null)
  }

  return (
    <div className="mt-3">
      <div className={sheetOnly ? 'hidden' : 'flex flex-wrap items-center gap-2'}>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Contacts</span>
        {loading ? <span className="text-sm text-slate-500">Loading…</span> : null}
        {!loading && filled.length === 0 ? <span className="text-sm text-slate-500">No contacts yet.</span> : null}
        {filled.map((row) => (
          <button
            key={`${row.category}-${row.role}`}
            type="button"
            onClick={onOpenWindow}
            className="rounded-full border border-slate-200 bg-surface px-2.5 py-1 text-xs text-slate-700 hover:border-brand-700"
            title={[row.email, row.phone].filter(Boolean).join(' · ')}
          >
            <span className="font-semibold text-slate-900">{row.role}:</span> {row.contact || row.company}
            {row.contact && row.company ? <span className="text-slate-500"> ({row.company})</span> : null}
          </button>
        ))}
      </div>

      {open ? (
        <div className="mt-3 space-y-4">
          {editing ? (
            <datalist id="project-contact-companies">
              {knownOptions(editing.category, editing.role).map((item) => (
                <option key={item.id} value={item.company}>{[item.contact, item.role].filter(Boolean).join(' · ')}</option>
              ))}
            </datalist>
          ) : null}
          {categories.map((category) => (
            <div key={category.key}>
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-brand-700">{category.title}</h4>
                <button
                  type="button"
                  onClick={() => setNewRole({ category: category.key, role: '' })}
                  className="text-xs font-semibold text-brand-700 hover:underline"
                >
                  + Add {category.key === 'design_team' ? 'role' : 'trade'}
                </button>
              </div>
              {newRole?.category === category.key ? (
                <form onSubmit={addRole} className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    autoFocus
                    value={newRole.role}
                    onChange={(event) => setNewRole({ ...newRole, role: event.target.value })}
                    placeholder={category.key === 'design_team' ? 'Role, e.g. Acoustical Consultant' : 'Trade, e.g. Demolition'}
                    className="w-72 rounded-lg border border-slate-300 bg-surface px-3 py-1.5 text-sm text-slate-900"
                  />
                  <PrimaryButton type="submit">Add</PrimaryButton>
                  <PrimaryButton type="button" variant="secondary" onClick={() => setNewRole(null)}>Cancel</PrimaryButton>
                </form>
              ) : null}
              <div className="ui-scroll mt-2 overflow-x-auto">
                <table className="ui-table min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border px-3 py-2 text-left">{category.key === 'design_team' ? 'Role' : 'Discipline / trade'}</th>
                      {FIELDS.map((field) => <th key={field.key} className="border px-3 py-2 text-left">{field.label}</th>)}
                      <th className="w-32 border px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {category.rows.map((row) => {
                      const isEditing = editing?.category === category.key && editing.role === row.role
                      return (
                        <tr key={row.role}>
                          <td className="whitespace-nowrap border px-3 py-1.5 text-sm font-medium">{row.role}</td>
                          {FIELDS.map((field) => (
                            <td key={field.key} className="border px-3 py-1.5 text-sm">
                              {isEditing ? (
                                <input
                                  type={field.type ?? 'text'}
                                  list={field.key === 'company' ? 'project-contact-companies' : undefined}
                                  value={draft[field.key]}
                                  onChange={(event) =>
                                    field.key === 'company'
                                      ? setCompany(category.key, row.role, event.target.value)
                                      : setDraft({ ...draft, [field.key]: event.target.value })
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') void save(category.key, row.role)
                                    if (event.key === 'Escape') setEditing(null)
                                  }}
                                  aria-label={`${row.role} ${field.label}`}
                                  className={cellInputClass}
                                />
                              ) : field.key === 'email' && row.email ? (
                                <a href={`mailto:${row.email}`} className="text-brand-700 hover:underline">{row.email}</a>
                              ) : (
                                row[field.key]
                              )}
                            </td>
                          ))}
                          <td className="whitespace-nowrap border px-3 py-1.5 text-right text-xs">
                            {isEditing ? (
                              <>
                                <button type="button" disabled={saving} onClick={() => void save(category.key, row.role)} className="font-semibold text-brand-700 hover:underline">Save</button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditing(null)
                                    if (row.custom && row.id === null) replaceRow(category.key, row.role, null)
                                  }}
                                  className="ml-3 text-slate-500 hover:underline"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => startEdit(category.key, row)} className="font-semibold text-brand-700 hover:underline">Edit</button>
                                {row.id !== null ? (
                                  <button type="button" onClick={() => void clear(category.key, row)} className="ml-3 text-rose-700 hover:underline">
                                    {row.custom ? 'Remove' : 'Clear'}
                                  </button>
                                ) : null}
                              </>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
