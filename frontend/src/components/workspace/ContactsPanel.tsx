import { FormEvent, useEffect, useMemo, useState } from 'react'

import PrimaryButton from '../common/PrimaryButton'
import SectionHeader from '../common/SectionHeader'
import { cellInputClass, inputClass } from '../register/registerUi'
import { responseDetail } from '../../services/registerService'
import {
  CONTACT_CATEGORY_TITLES,
  CONTACT_ROLE_LABELS,
  createDirectoryContact,
  deleteContactRole,
  deleteDirectoryContact,
  emptyContactRoles,
  fetchContactRoles,
  fetchDirectoryContacts,
  updateDirectoryContact,
} from '../../services/contactsService'
import type { ContactRoles, DirectoryContact, DirectoryContactInput } from '../../services/contactsService'
import type { ContactCategoryKey } from '../../services/projectContactsService'

type ContactsPanelProps = {
  token: string
  setMessage: (message: string) => void
}

const CATEGORIES: ContactCategoryKey[] = ['design_team', 'contractors']
const FIELDS = [
  { key: 'company', label: 'Company' },
  { key: 'contact', label: 'Contact' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'notes', label: 'Notes' },
] as const

const emptyInput = (category: ContactCategoryKey, role = ''): DirectoryContactInput => ({
  category,
  role,
  company: '',
  contact: '',
  email: '',
  phone: '',
  notes: '',
})

// One line of the sheet: a contact, or an empty role waiting to be filled.
type SheetRow = { kind: 'contact'; contact: DirectoryContact } | { kind: 'empty'; role: string; roleId: number }

export default function ContactsPanel({ token, setMessage }: ContactsPanelProps) {
  const [roles, setRoles] = useState<ContactRoles>(emptyContactRoles)
  const [contacts, setContacts] = useState<DirectoryContact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addDraft, setAddDraft] = useState<DirectoryContactInput>(emptyInput('design_team'))
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<DirectoryContactInput | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    void Promise.all([fetchContactRoles(token), fetchDirectoryContacts(token)]).then(([nextRoles, nextContacts]) => {
      if (cancelled) return
      setRoles(nextRoles)
      setContacts(nextContacts)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  const reloadRoles = async () => setRoles(await fetchContactRoles(token))

  const query = search.trim().toLowerCase()
  const matches = (contact: DirectoryContact) =>
    !query || `${contact.role} ${contact.company} ${contact.contact} ${contact.email} ${contact.phone} ${contact.notes}`.toLowerCase().includes(query)

  // Same order as the sheet: every role in order, its contacts (or one empty line), then contacts without a listed role.
  const sheets = useMemo(() => {
    return CATEGORIES.map((category) => {
      const inCategory = contacts.filter((contact) => contact.category === category)
      const rows: SheetRow[] = []
      roles[category].forEach((role) => {
        const forRole = inCategory.filter((contact) => contact.role === role.name)
        if (forRole.length) forRole.filter(matches).forEach((contact) => rows.push({ kind: 'contact', contact }))
        else if (!query || role.name.toLowerCase().includes(query)) rows.push({ kind: 'empty', role: role.name, roleId: role.id })
      })
      const listed = new Set(roles[category].map((role) => role.name))
      inCategory.filter((contact) => !listed.has(contact.role) && matches(contact)).forEach((contact) => rows.push({ kind: 'contact', contact }))
      return { category, rows }
    })
  }, [contacts, roles, query]) // `matches` only depends on `query`

  const openAdd = (category: ContactCategoryKey, role = '') => {
    setAddDraft(emptyInput(category, role))
    setShowAdd(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    const res = await createDirectoryContact(token, addDraft)
    setSaving(false)
    if (!res.ok || !res.data) return setMessage(responseDetail(res.data, 'Failed to add contact.'))
    setContacts((prev) => [...prev, res.data as DirectoryContact])
    await reloadRoles()
    setShowAdd(false)
    setMessage(`Added ${res.data.contact || res.data.company}.`)
  }

  const handleSave = async (id: number) => {
    if (!editDraft) return
    setSaving(true)
    const res = await updateDirectoryContact(token, id, editDraft)
    setSaving(false)
    if (!res.ok || !res.data) return setMessage(responseDetail(res.data, 'Failed to save contact.'))
    setContacts((prev) => prev.map((contact) => (contact.id === id ? (res.data as DirectoryContact) : contact)))
    await reloadRoles()
    setEditingId(null)
    setMessage('Contact saved.')
  }

  const handleDelete = async (contact: DirectoryContact) => {
    if (!confirm(`Delete ${contact.contact || contact.company}${contact.role ? ` (${contact.role})` : ''}?`)) return
    const res = await deleteDirectoryContact(token, contact.id)
    if (!res.ok) return setMessage(responseDetail(res.data, 'Failed to delete contact.'))
    setContacts((prev) => prev.filter((item) => item.id !== contact.id))
    setMessage('Contact deleted.')
  }

  const handleRemoveRole = async (roleId: number, name: string) => {
    if (!confirm(`Remove "${name}" from the list of roles?`)) return
    const res = await deleteContactRole(token, roleId)
    if (!res.ok || !res.data) return setMessage(responseDetail(res.data, 'Failed to remove role.'))
    setRoles(res.data)
    setMessage(`Removed ${name}.`)
  }

  return (
    <section className="ui-panel slide-in">
      <SectionHeader
        title="Contacts"
        subtitle="Design team, general contractor and subcontractors. Roles come from the database; type a new one to add it."
        actions={
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contacts"
              aria-label="Search contacts"
              className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-900"
            />
            <PrimaryButton type="button" onClick={() => (showAdd ? setShowAdd(false) : openAdd('design_team'))}>
              {showAdd ? 'Cancel' : '+ Add contact'}
            </PrimaryButton>
          </div>
        }
      />

      {showAdd ? (
        <form onSubmit={(event) => void handleAdd(event)} className="mt-4 rounded-xl border border-slate-200 bg-surface p-4">
          <p className="text-sm font-semibold text-slate-900">Add contact</p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <label className="text-sm text-slate-700">Group
              <select
                value={addDraft.category}
                onChange={(e) => setAddDraft({ ...addDraft, category: e.target.value as ContactCategoryKey, role: '' })}
                className={inputClass}
              >
                {CATEGORIES.map((category) => <option key={category} value={category}>{CONTACT_CATEGORY_TITLES[category]}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-700">{CONTACT_ROLE_LABELS[addDraft.category]}
              <input
                list={`contact-roles-${addDraft.category}`}
                value={addDraft.role}
                onChange={(e) => setAddDraft({ ...addDraft, role: e.target.value })}
                placeholder="Start typing to see suggestions"
                autoFocus
                className={inputClass}
              />
            </label>
            {FIELDS.map((field) => (
              <label key={field.key} className={`text-sm text-slate-700 ${field.key === 'notes' ? 'md:col-span-2' : ''}`}>{field.label}
                <input
                  type={'type' in field ? field.type : 'text'}
                  value={addDraft[field.key]}
                  onChange={(e) => setAddDraft({ ...addDraft, [field.key]: e.target.value })}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
          {addDraft.role && !roles[addDraft.category].some((role) => role.name.toLowerCase() === addDraft.role.trim().toLowerCase()) ? (
            <p className="mt-2 text-xs text-slate-500">&quot;{addDraft.role.trim()}&quot; is a new {addDraft.category === 'design_team' ? 'role' : 'trade'}; it will be added to the list.</p>
          ) : null}
          <PrimaryButton type="submit" className="mt-3" disabled={saving}>{saving ? 'Saving…' : 'Add contact'}</PrimaryButton>
        </form>
      ) : null}

      {CATEGORIES.map((category) => (
        <datalist key={category} id={`contact-roles-${category}`}>
          {roles[category].map((role) => <option key={role.id} value={role.name} />)}
        </datalist>
      ))}

      {loading ? <p className="mt-4 text-sm text-slate-500">Loading contacts…</p> : null}

      {!loading
        ? sheets.map(({ category, rows }) => (
            <div key={category} className="mt-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-brand-700">{CONTACT_CATEGORY_TITLES[category]}</h3>
                <button type="button" onClick={() => openAdd(category)} className="text-sm font-semibold text-brand-700 hover:underline">+ Add</button>
              </div>
              <div className="ui-scroll mt-2 overflow-x-auto">
                <table className="ui-table min-w-[960px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border px-3 py-2 text-left">{CONTACT_ROLE_LABELS[category]}</th>
                      {FIELDS.map((field) => <th key={field.key} className="border px-3 py-2 text-left">{field.label}</th>)}
                      <th className="w-32 border px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      if (row.kind === 'empty') {
                        return (
                          <tr key={`role-${row.roleId}`}>
                            <td className="whitespace-nowrap border px-3 py-1.5 text-sm font-medium">{row.role}</td>
                            {FIELDS.map((field) => <td key={field.key} className="border px-3 py-1.5" />)}
                            <td className="whitespace-nowrap border px-3 py-1.5 text-right text-xs">
                              <button type="button" onClick={() => openAdd(category, row.role)} className="font-semibold text-brand-700 hover:underline">Add</button>
                              <button type="button" onClick={() => void handleRemoveRole(row.roleId, row.role)} className="ml-3 text-slate-500 hover:underline" title="Remove this role from the list">
                                Remove
                              </button>
                            </td>
                          </tr>
                        )
                      }
                      const { contact } = row
                      const isEditing = editingId === contact.id && editDraft
                      return (
                        <tr key={contact.id}>
                          <td className="whitespace-nowrap border px-3 py-1.5 text-sm font-medium">
                            {isEditing ? (
                              <input
                                list={`contact-roles-${category}`}
                                value={editDraft.role}
                                onChange={(e) => setEditDraft({ ...editDraft, role: e.target.value })}
                                aria-label="Role"
                                className={cellInputClass}
                              />
                            ) : (
                              contact.role || <span className="text-slate-400">No {category === 'design_team' ? 'role' : 'trade'}</span>
                            )}
                          </td>
                          {FIELDS.map((field) => (
                            <td key={field.key} className="border px-3 py-1.5 text-sm">
                              {isEditing ? (
                                <input
                                  type={'type' in field ? field.type : 'text'}
                                  value={editDraft[field.key]}
                                  onChange={(e) => setEditDraft({ ...editDraft, [field.key]: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') void handleSave(contact.id)
                                    if (e.key === 'Escape') setEditingId(null)
                                  }}
                                  aria-label={field.label}
                                  className={cellInputClass}
                                />
                              ) : field.key === 'email' && contact.email ? (
                                <a href={`mailto:${contact.email}`} className="text-brand-700 hover:underline">{contact.email}</a>
                              ) : (
                                contact[field.key]
                              )}
                            </td>
                          ))}
                          <td className="whitespace-nowrap border px-3 py-1.5 text-right text-xs">
                            {isEditing ? (
                              <>
                                <button type="button" disabled={saving} onClick={() => void handleSave(contact.id)} className="font-semibold text-brand-700 hover:underline">Save</button>
                                <button type="button" onClick={() => setEditingId(null)} className="ml-3 text-slate-500 hover:underline">Cancel</button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(contact.id)
                                    setEditDraft({
                                      category: contact.category,
                                      role: contact.role,
                                      company: contact.company,
                                      contact: contact.contact,
                                      email: contact.email,
                                      phone: contact.phone,
                                      notes: contact.notes,
                                    })
                                  }}
                                  className="font-semibold text-brand-700 hover:underline"
                                >
                                  Edit
                                </button>
                                <button type="button" onClick={() => void handleDelete(contact)} className="ml-3 text-rose-700 hover:underline">Delete</button>
                              </>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={FIELDS.length + 2} className="border px-3 py-3 text-sm text-slate-500">No contacts match the search.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        : null}
    </section>
  )
}
