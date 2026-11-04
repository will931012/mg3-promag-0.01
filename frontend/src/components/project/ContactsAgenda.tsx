import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import Icon from '../common/Icon'
import type { IconName } from '../common/Icon'
import PrimaryButton from '../common/PrimaryButton'
import { inputClass } from '../register/registerUi'
import { fetchKnownContacts } from '../../services/contactsService'
import type { KnownContact } from '../../services/contactsService'
import { deleteProjectContact, fetchProjectContacts, saveProjectContact } from '../../services/projectContactsService'
import type { ContactCategoryKey, ProjectContactCategory, ProjectContactFields, ProjectContactRow } from '../../services/projectContactsService'
import { responseDetail } from '../../services/registerService'

type ContactsAgendaProps = {
  token: string
  projectId: string
  setMessage: (message: string) => void
}

// A filled-in row of the project's contact sheet, shown as an address-book entry.
type Entry = ProjectContactRow & {
  id: number
  key: string
  category: ContactCategoryKey
  categoryTitle: string
  name: string
}

type Folder = 'all' | ContactCategoryKey
type Draft = ProjectContactFields & { category: ContactCategoryKey; role: string }

const FOLDER_LABELS: Record<Folder, string> = {
  all: 'All contacts',
  design_team: 'Design team',
  contractors: 'GC & subcontractors',
}
const FOLDER_ICONS: Record<Folder, IconName> = { all: 'contacts', design_team: 'users', contractors: 'building' }

const entryKey = (category: string, role: string) => `${category}|${role}`
const emptyDraft = (category: ContactCategoryKey = 'design_team'): Draft => ({ category, role: '', company: '', contact: '', email: '', phone: '', notes: '' })

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toUpperCase()
}

// A stable color per name, like Outlook's avatars.
function avatarColor(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return `hsl(${Math.abs(hash) % 360} 52% 42%)`
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-20 w-20 text-2xl' : 'h-10 w-10 text-sm'
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizeClass}`} style={{ backgroundColor: avatarColor(name) }} aria-hidden="true">
      {initials(name)}
    </span>
  )
}

function letterOf(name: string): string {
  const first = name.trim().charAt(0).toUpperCase()
  return /\p{L}/u.test(first) ? first.normalize('NFD').charAt(0) : '#'
}

/**
 * The project's contact sheet as an address book (Outlook-style): folders, an alphabetical list and a contact card.
 */
export default function ContactsAgenda({ token, projectId, setMessage }: ContactsAgendaProps) {
  const [categories, setCategories] = useState<ProjectContactCategory[]>([])
  const [known, setKnown] = useState<KnownContact[]>([])
  const [loading, setLoading] = useState(true)
  const [folder, setFolder] = useState<Folder>('all')
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view')
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetchProjectContacts(token, projectId)
    setCategories(res.ok && res.data ? res.data.categories : [])
    setLoading(false)
  }, [token, projectId])

  useEffect(() => {
    setLoading(true)
    setSelectedKey(null)
    setMode('view')
    void load()
  }, [load])

  useEffect(() => {
    void fetchKnownContacts(token).then(setKnown)
  }, [token])

  const entries = useMemo<Entry[]>(
    () =>
      categories.flatMap((category) =>
        category.rows
          .filter((row): row is ProjectContactRow & { id: number } => row.id !== null && Boolean(row.company || row.contact || row.email || row.phone))
          .map((row) => ({
            ...row,
            key: entryKey(category.key, row.role),
            category: category.key,
            categoryTitle: category.title,
            name: row.contact || row.company || row.role,
          }))
      ),
    [categories]
  )

  const counts = useMemo(
    () => ({
      all: entries.length,
      design_team: entries.filter((entry) => entry.category === 'design_team').length,
      contractors: entries.filter((entry) => entry.category === 'contractors').length,
    }),
    [entries]
  )

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase()
    const visible = entries
      .filter((entry) => folder === 'all' || entry.category === folder)
      .filter((entry) => !query || `${entry.name} ${entry.company} ${entry.role} ${entry.email} ${entry.phone} ${entry.notes}`.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    const byLetter = new Map<string, Entry[]>()
    visible.forEach((entry) => {
      const letter = letterOf(entry.name)
      byLetter.set(letter, [...(byLetter.get(letter) ?? []), entry])
    })
    return Array.from(byLetter.entries())
  }, [entries, folder, search])

  const selected = entries.find((entry) => entry.key === selectedKey) ?? null

  // Roles of a group with nobody assigned yet (plus the one being edited): the suggestions when adding.
  const openRoles = (category: ContactCategoryKey, current?: string) =>
    (categories.find((item) => item.key === category)?.rows ?? [])
      .filter((row) => row.role === current || !entries.some((entry) => entry.category === category && entry.role === row.role))
      .map((row) => row.role)

  const knownForDraft = known.filter((item) => item.category === draft.category && item.company)
  const companyOptions = Array.from(new Set((knownForDraft.some((item) => item.role === draft.role) ? knownForDraft.filter((item) => item.role === draft.role) : knownForDraft).map((item) => item.company)))

  const setCompany = (company: string) => {
    const match = knownForDraft.find((item) => item.company === company && (item.role === draft.role || !draft.role))
    setDraft((prev) =>
      match && !prev.contact && !prev.email && !prev.phone ? { ...prev, company, contact: match.contact, email: match.email, phone: match.phone } : { ...prev, company }
    )
  }

  const startNew = () => {
    setDraft(emptyDraft(folder === 'all' ? 'design_team' : folder))
    setMode('new')
  }

  const startEdit = (entry: Entry) => {
    setDraft({ category: entry.category, role: entry.role, company: entry.company, contact: entry.contact, email: entry.email, phone: entry.phone, notes: entry.notes })
    setMode('edit')
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    const role = draft.role.trim()
    if (!role) return setMessage('Pick a role or trade.')
    if (!draft.company.trim() && !draft.contact.trim()) return setMessage('Enter a company or a contact name.')
    const moving = mode === 'new' || !selected || selected.category !== draft.category || selected.role.toLowerCase() !== role.toLowerCase()
    const taken = entries.find((entry) => entry.category === draft.category && entry.role.toLowerCase() === role.toLowerCase())
    if (moving && taken) return setMessage(`${taken.role} already has a contact on this project (${taken.name}). Edit that one instead.`)

    setSaving(true)
    const res = await saveProjectContact(token, projectId, { ...draft, role })
    if (res.ok && res.data && mode === 'edit' && selected && moving) {
      // The contact moved to another role: free the old row.
      await deleteProjectContact(token, projectId, selected.id)
    }
    setSaving(false)
    if (!res.ok || !res.data) return setMessage(responseDetail(res.data, 'Failed to save contact.'))
    await load()
    setSelectedKey(entryKey(draft.category, res.data.role))
    setMode('view')
    setMessage(`Saved ${draft.contact.trim() || draft.company.trim()}.`)
  }

  const handleDelete = async (entry: Entry) => {
    if (!confirm(`Delete ${entry.name} (${entry.role}) from this project?`)) return
    const res = await deleteProjectContact(token, projectId, entry.id)
    if (!res.ok) return setMessage(responseDetail(res.data, 'Failed to delete contact.'))
    await load()
    setSelectedKey(null)
    setMessage(`Deleted ${entry.name}.`)
  }

  const showDetail = mode !== 'view' || selected !== null

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-surface lg:grid lg:min-h-[600px] lg:grid-cols-[210px_340px_minmax(0,1fr)]">
      {/* Folders */}
      <nav className="border-b border-slate-200 p-3 lg:border-b-0 lg:border-r" aria-label="Contact folders">
        <PrimaryButton type="button" className="flex w-full items-center justify-center gap-2" onClick={startNew}>
          <Icon name="plus" className="h-4 w-4" /> New contact
        </PrimaryButton>
        <ul className="mt-3 flex gap-1 overflow-x-auto lg:block lg:space-y-1">
          {(['all', 'design_team', 'contractors'] as Folder[]).map((key) => (
            <li key={key} className="shrink-0">
              <button
                type="button"
                onClick={() => setFolder(key)}
                aria-current={folder === key ? 'true' : undefined}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${folder === key ? 'bg-nav-active font-semibold text-nav-active-ink' : 'text-slate-700 hover:bg-hover'}`}
              >
                <Icon name={FOLDER_ICONS[key]} className="h-4 w-4 shrink-0" />
                <span className="flex-1 whitespace-nowrap">{FOLDER_LABELS[key]}</span>
                <span className="text-xs text-slate-500">{counts[key]}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* List */}
      <div className={`border-slate-200 lg:flex lg:flex-col lg:border-r ${showDetail ? 'hidden lg:flex' : ''}`}>
        <div className="border-b border-slate-200 p-3">
          <label className="relative block">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contacts"
              aria-label="Search contacts"
              className="w-full rounded-lg border border-slate-300 bg-surface py-2 pl-9 pr-3 text-sm text-slate-900"
            />
          </label>
        </div>
        <div className="ui-scroll max-h-[70vh] overflow-y-auto lg:max-h-none lg:flex-1">
          {loading ? <p className="p-4 text-sm text-slate-500">Loading contacts…</p> : null}
          {!loading && groups.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">{entries.length ? 'No contacts match.' : 'No contacts on this project yet. Use New contact to add one.'}</p>
          ) : null}
          {groups.map(([letter, items]) => (
            <section key={letter} aria-label={letter}>
              <h4 className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-1 text-xs font-semibold text-brand-700">{letter}</h4>
              <ul>
                {items.map((entry) => (
                  <li key={entry.key}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedKey(entry.key)
                        setMode('view')
                      }}
                      aria-current={entry.key === selectedKey ? 'true' : undefined}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${entry.key === selectedKey && mode === 'view' ? 'bg-nav-active' : 'hover:bg-hover'}`}
                    >
                      <Avatar name={entry.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">{entry.name}</span>
                        <span className="block truncate text-xs text-slate-500">{[entry.role, entry.contact ? entry.company : ''].filter(Boolean).join(' · ')}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {/* Contact card / form */}
      <div className={`${showDetail ? '' : 'hidden lg:block'} p-5`}>
        {showDetail ? (
          <button
            type="button"
            onClick={() => {
              setSelectedKey(null)
              setMode('view')
            }}
            className="mb-3 text-sm font-semibold text-brand-700 hover:underline lg:hidden"
          >
            ← All contacts
          </button>
        ) : null}

        {mode !== 'view' ? (
          <form onSubmit={(event) => void handleSave(event)} className="max-w-2xl">
            <div className="flex items-center gap-4">
              <Avatar name={draft.contact || draft.company || '?'} size="lg" />
              <h3 className="text-2xl font-semibold text-slate-900">{mode === 'new' ? 'New contact' : 'Edit contact'}</h3>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-700">Group
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ContactCategoryKey, role: '' })} className={inputClass}>
                  <option value="design_team">Design team / reviewers</option>
                  <option value="contractors">General contractor and subcontractors</option>
                </select>
              </label>
              <label className="text-sm text-slate-700">{draft.category === 'design_team' ? 'Role' : 'Discipline / trade'}
                <input
                  list="agenda-open-roles"
                  required
                  value={draft.role}
                  onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                  placeholder="Start typing to see suggestions"
                  className={inputClass}
                />
                <datalist id="agenda-open-roles">
                  {openRoles(draft.category, mode === 'edit' ? selected?.role : undefined).map((role) => <option key={role} value={role} />)}
                </datalist>
              </label>
              <label className="text-sm text-slate-700">Company
                <input list="agenda-companies" value={draft.company} onChange={(e) => setCompany(e.target.value)} className={inputClass} />
                <datalist id="agenda-companies">
                  {companyOptions.map((company) => <option key={company} value={company} />)}
                </datalist>
              </label>
              <label className="text-sm text-slate-700">Contact name
                <input value={draft.contact} onChange={(e) => setDraft({ ...draft, contact: e.target.value })} className={inputClass} />
              </label>
              <label className="text-sm text-slate-700">Email
                <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className={inputClass} />
              </label>
              <label className="text-sm text-slate-700">Phone
                <input type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className={inputClass} />
              </label>
              <label className="text-sm text-slate-700 sm:col-span-2">Notes
                <textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className={inputClass} />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</PrimaryButton>
              <PrimaryButton type="button" variant="secondary" onClick={() => setMode('view')}>Cancel</PrimaryButton>
            </div>
          </form>
        ) : selected ? (
          <article className="max-w-2xl">
            <div className="flex items-center gap-4">
              <Avatar name={selected.name} size="lg" />
              <div className="min-w-0">
                <h3 className="truncate text-2xl font-semibold text-slate-900">{selected.name}</h3>
                <p className="mt-0.5 text-sm text-slate-600">{[selected.role, selected.contact ? selected.company : ''].filter(Boolean).join(' · ')}</p>
                <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{selected.categoryTitle}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { label: 'Email', icon: 'mail' as const, href: selected.email ? `mailto:${selected.email}` : '' },
                { label: 'Call', icon: 'phone' as const, href: selected.phone ? `tel:${selected.phone.replace(/[^\d+]/g, '')}` : '' },
              ].map((action) =>
                action.href ? (
                  <a key={action.label} href={action.href} className="ui-btn ui-btn-secondary inline-flex items-center gap-2">
                    <Icon name={action.icon} className="h-4 w-4" /> {action.label}
                  </a>
                ) : null
              )}
              <PrimaryButton type="button" variant="secondary" className="inline-flex items-center gap-2" onClick={() => startEdit(selected)}>
                <Icon name="edit" className="h-4 w-4" /> Edit
              </PrimaryButton>
              <PrimaryButton type="button" variant="secondary" className="inline-flex items-center gap-2 text-rose-700" onClick={() => void handleDelete(selected)}>
                <Icon name="trash" className="h-4 w-4" /> Delete
              </PrimaryButton>
            </div>

            <section className="mt-6 rounded-xl border border-slate-200 p-4">
              <h4 className="text-sm font-semibold text-slate-900">Contact information</h4>
              <dl className="mt-3 space-y-3 text-sm">
                {[
                  { icon: 'mail' as const, label: 'Email', value: selected.email, href: selected.email ? `mailto:${selected.email}` : '' },
                  { icon: 'phone' as const, label: 'Phone', value: selected.phone, href: selected.phone ? `tel:${selected.phone.replace(/[^\d+]/g, '')}` : '' },
                  { icon: 'building' as const, label: 'Company', value: selected.company, href: '' },
                  { icon: 'users' as const, label: selected.category === 'design_team' ? 'Role' : 'Trade', value: selected.role, href: '' },
                ].map((field) => (
                  <div key={field.label} className="flex items-start gap-3">
                    <Icon name={field.icon} className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-500">{field.label}</dt>
                      <dd className="break-words text-slate-900">
                        {field.value ? (field.href ? <a href={field.href} className="text-brand-700 hover:underline">{field.value}</a> : field.value) : <span className="text-slate-400">—</span>}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </section>

            {selected.notes ? (
              <section className="mt-4 rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-semibold text-slate-900">Notes</h4>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selected.notes}</p>
              </section>
            ) : null}
          </article>
        ) : (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-slate-500">
            <Icon name="contacts" className="h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm">Select a contact to see their details.</p>
          </div>
        )}
      </div>
    </div>
  )
}
