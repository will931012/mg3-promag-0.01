import { FormEvent, useEffect, useMemo, useState } from 'react'

import { EOR_TYPES } from '../../app/eorTypes'
import type { EorType } from '../../app/eorTypes'
import {
  createAor,
  createContractor,
  createEor,
  createSubcontractor,
  deleteAor,
  deleteContractor,
  deleteEor,
  deleteSubcontractor,
  fetchAors,
  fetchContractors,
  fetchEors,
  fetchSubcontractors,
  updateAor,
  updateContractor,
  updateEor,
  updateSubcontractor,
} from '../../services/workspaceService'
import type { AorRecord, ContractorRecord, EorRecord, SubcontractorRecord } from '../../types/workspace'
import EmptyState from '../common/EmptyState'
import PrimaryButton from '../common/PrimaryButton'
import SectionHeader from '../common/SectionHeader'

type ContactsPanelProps = {
  token: string
  setMessage: (message: string) => void
}

type NamedRecord = { id: number; name: string }

type ContactSectionProps<T extends NamedRecord> = {
  title: string
  subtitle: string
  items: T[]
  search: string
  onSearchChange: (value: string) => void
  editingId: number | null
  editingName: string
  onEditStart: (item: T) => void
  onEditCancel: () => void
  onEditSave: (id: number) => Promise<void>
  onDelete: (id: number) => Promise<void>
  renderName?: (item: T) => string
  form: React.ReactNode
}

function ContactSection<T extends NamedRecord>({
  title,
  subtitle,
  items,
  search,
  onSearchChange,
  editingId,
  editingName,
  onEditStart,
  onEditCancel,
  onEditSave,
  onDelete,
  renderName,
  form,
}: ContactSectionProps<T>) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={`Search ${title.toLowerCase()}`}
          className="min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="ui-scroll max-h-[320px] overflow-auto rounded-lg border border-slate-200">
          <table className="ui-table min-w-full">
            <thead>
              <tr className="bg-slate-100">
                <th className="border px-3 py-2 text-left">ID</th>
                <th className="border px-3 py-2 text-left">Name</th>
                <th className="border px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="border px-3 py-2">{item.id}</td>
                  <td className="border px-3 py-2">
                    {editingId === item.id ? (
                      <input value={editingName} onChange={() => undefined} readOnly className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                    ) : (
                      renderName ? renderName(item) : item.name
                    )}
                  </td>
                  <td className="border px-3 py-2">
                    <div className="flex gap-2">
                      {editingId === item.id ? (
                        <>
                          <button type="button" onClick={() => void onEditSave(item.id)} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">Save</button>
                          <button type="button" onClick={onEditCancel} className="rounded bg-slate-200 px-2 py-1 text-xs">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => onEditStart(item)} className="rounded bg-slate-200 px-2 py-1 text-xs">Edit</button>
                          <button type="button" onClick={() => void onDelete(item.id)} className="rounded bg-rose-600 px-2 py-1 text-xs text-white">Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="border px-3 py-8">
                    <EmptyState title={`No ${title.toLowerCase()} found`} description="Create one using the form on the right." />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          {form}
        </div>
      </div>
    </article>
  )
}

export default function ContactsPanel({ token, setMessage }: ContactsPanelProps) {
  const [aors, setAors] = useState<AorRecord[]>([])
  const [eors, setEors] = useState<EorRecord[]>([])
  const [contractors, setContractors] = useState<ContractorRecord[]>([])
  const [subcontractors, setSubcontractors] = useState<SubcontractorRecord[]>([])
  const [aorName, setAorName] = useState('')
  const [eorName, setEorName] = useState('')
  const [eorType, setEorType] = useState<EorType>('Civil EOR')
  const [contractorName, setContractorName] = useState('')
  const [subcontractorName, setSubcontractorName] = useState('')
  const [aorSearch, setAorSearch] = useState('')
  const [eorSearch, setEorSearch] = useState('')
  const [contractorSearch, setContractorSearch] = useState('')
  const [subcontractorSearch, setSubcontractorSearch] = useState('')
  const [editingAorId, setEditingAorId] = useState<number | null>(null)
  const [editingAorName, setEditingAorName] = useState('')
  const [editingEorId, setEditingEorId] = useState<number | null>(null)
  const [editingEorName, setEditingEorName] = useState('')
  const [editingEorType, setEditingEorType] = useState<EorType>('Civil EOR')
  const [editingContractorId, setEditingContractorId] = useState<number | null>(null)
  const [editingContractorName, setEditingContractorName] = useState('')
  const [editingSubcontractorId, setEditingSubcontractorId] = useState<number | null>(null)
  const [editingSubcontractorName, setEditingSubcontractorName] = useState('')

  const loadContacts = async () => {
    const [nextAors, nextEors, nextContractors, nextSubcontractors] = await Promise.all([
      fetchAors(token),
      fetchEors(token),
      fetchContractors(token),
      fetchSubcontractors(token),
    ])
    setAors(nextAors)
    setEors(nextEors)
    setContractors(nextContractors)
    setSubcontractors(nextSubcontractors)
  }

  useEffect(() => {
    void loadContacts()
  }, [token])

  const filteredAors = useMemo(() => aors.filter((item) => item.name.toLowerCase().includes(aorSearch.trim().toLowerCase())), [aors, aorSearch])
  const filteredEors = useMemo(() => eors.filter((item) => `${item.type} ${item.name}`.toLowerCase().includes(eorSearch.trim().toLowerCase())), [eors, eorSearch])
  const filteredContractors = useMemo(() => contractors.filter((item) => item.name.toLowerCase().includes(contractorSearch.trim().toLowerCase())), [contractors, contractorSearch])
  const filteredSubcontractors = useMemo(() => subcontractors.filter((item) => item.name.toLowerCase().includes(subcontractorSearch.trim().toLowerCase())), [subcontractors, subcontractorSearch])

  const handleCreateAor = async (event: FormEvent) => {
    event.preventDefault()
    const res = await createAor(token, { name: aorName.trim() })
    if (!res.ok || !res.data) return setMessage('Failed to create AOR.')
    setAorName('')
    setMessage('AOR created.')
    await loadContacts()
  }

  const handleCreateEor = async (event: FormEvent) => {
    event.preventDefault()
    const res = await createEor(token, { type: eorType, name: eorName.trim() })
    if (!res.ok || !res.data) return setMessage('Failed to create EOR.')
    setEorName('')
    setMessage('EOR created.')
    await loadContacts()
  }

  const handleCreateContractor = async (event: FormEvent) => {
    event.preventDefault()
    const res = await createContractor(token, { name: contractorName.trim() })
    if (!res.ok || !res.data) return setMessage('Failed to create contractor.')
    setContractorName('')
    setMessage('Contractor created.')
    await loadContacts()
  }

  const handleCreateSubcontractor = async (event: FormEvent) => {
    event.preventDefault()
    const res = await createSubcontractor(token, { name: subcontractorName.trim() })
    if (!res.ok || !res.data) return setMessage('Failed to create subcontractor.')
    setSubcontractorName('')
    setMessage('Subcontractor created.')
    await loadContacts()
  }

  const handleDelete = async (label: string, action: () => Promise<{ ok: boolean }>) => {
    if (!confirm(`Delete ${label}?`)) return
    const res = await action()
    if (!res.ok) return setMessage(`Failed to delete ${label}.`)
    setMessage(`${label} deleted.`)
    await loadContacts()
  }

  return (
    <section className="ui-panel slide-in space-y-4">
      <SectionHeader
        title="Contacts"
        subtitle="Central directory for AORs, EORs, contractors and subcontractors used across the workspace."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">AORs</h3>
              <p className="mt-1 text-sm text-slate-500">Architects of record available for project assignments.</p>
            </div>
            <input value={aorSearch} onChange={(event) => setAorSearch(event.target.value)} placeholder="Search aors" className="min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="ui-scroll max-h-[320px] overflow-auto rounded-lg border border-slate-200">
              <table className="ui-table min-w-full">
                <thead><tr className="bg-slate-100"><th className="border px-3 py-2 text-left">ID</th><th className="border px-3 py-2 text-left">Name</th><th className="border px-3 py-2 text-left">Actions</th></tr></thead>
                <tbody>
                  {filteredAors.map((item) => (
                    <tr key={item.id}>
                      <td className="border px-3 py-2">{item.id}</td>
                      <td className="border px-3 py-2">
                        {editingAorId === item.id ? <input value={editingAorName} onChange={(event) => setEditingAorName(event.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" /> : item.name}
                      </td>
                      <td className="border px-3 py-2">
                        <div className="flex gap-2">
                          {editingAorId === item.id ? (
                            <>
                              <button type="button" onClick={async () => { const res = await updateAor(token, item.id, { name: editingAorName.trim() }); if (!res.ok) return setMessage('Failed to update AOR.'); setEditingAorId(null); setEditingAorName(''); setMessage('AOR updated.'); await loadContacts() }} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">Save</button>
                              <button type="button" onClick={() => { setEditingAorId(null); setEditingAorName('') }} className="rounded bg-slate-200 px-2 py-1 text-xs">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => { setEditingAorId(item.id); setEditingAorName(item.name) }} className="rounded bg-slate-200 px-2 py-1 text-xs">Edit</button>
                              <button type="button" onClick={() => void handleDelete('AOR', () => deleteAor(token, item.id))} className="rounded bg-rose-600 px-2 py-1 text-xs text-white">Delete</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAors.length === 0 ? <tr><td colSpan={3} className="border px-3 py-8"><EmptyState title="No aors found" description="Create one using the form on the right." /></td></tr> : null}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <form onSubmit={handleCreateAor} className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Add AOR</h4>
                <input value={aorName} onChange={(event) => setAorName(event.target.value)} placeholder="AOR name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <PrimaryButton type="submit">Save AOR</PrimaryButton>
              </form>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">EORs</h3>
              <p className="mt-1 text-sm text-slate-500">Engineers of record organized by discipline.</p>
            </div>
            <input value={eorSearch} onChange={(event) => setEorSearch(event.target.value)} placeholder="Search eors" className="min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="ui-scroll max-h-[320px] overflow-auto rounded-lg border border-slate-200">
              <table className="ui-table min-w-full">
                <thead><tr className="bg-slate-100"><th className="border px-3 py-2 text-left">ID</th><th className="border px-3 py-2 text-left">Name</th><th className="border px-3 py-2 text-left">Actions</th></tr></thead>
                <tbody>
                  {filteredEors.map((item) => (
                    <tr key={item.id}>
                      <td className="border px-3 py-2">{item.id}</td>
                      <td className="border px-3 py-2">
                        {editingEorId === item.id ? (
                          <div className="space-y-2">
                            <select value={editingEorType} onChange={(event) => setEditingEorType(event.target.value as EorType)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm">
                              {EOR_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                            </select>
                            <input value={editingEorName} onChange={(event) => setEditingEorName(event.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                          </div>
                        ) : `${item.type}: ${item.name}`}
                      </td>
                      <td className="border px-3 py-2">
                        <div className="flex gap-2">
                          {editingEorId === item.id ? (
                            <>
                              <button type="button" onClick={async () => { const res = await updateEor(token, item.id, { type: editingEorType, name: editingEorName.trim() }); if (!res.ok) return setMessage('Failed to update EOR.'); setEditingEorId(null); setEditingEorName(''); setMessage('EOR updated.'); await loadContacts() }} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">Save</button>
                              <button type="button" onClick={() => { setEditingEorId(null); setEditingEorName('') }} className="rounded bg-slate-200 px-2 py-1 text-xs">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => { setEditingEorId(item.id); setEditingEorName(item.name); setEditingEorType(item.type) }} className="rounded bg-slate-200 px-2 py-1 text-xs">Edit</button>
                              <button type="button" onClick={() => void handleDelete('EOR', () => deleteEor(token, item.id))} className="rounded bg-rose-600 px-2 py-1 text-xs text-white">Delete</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEors.length === 0 ? <tr><td colSpan={3} className="border px-3 py-8"><EmptyState title="No eors found" description="Create one using the form on the right." /></td></tr> : null}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <form onSubmit={handleCreateEor} className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Add EOR</h4>
                <select value={eorType} onChange={(event) => setEorType(event.target.value as EorType)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {EOR_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <input value={eorName} onChange={(event) => setEorName(event.target.value)} placeholder="EOR name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <PrimaryButton type="submit">Save EOR</PrimaryButton>
              </form>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Contractors</h3>
              <p className="mt-1 text-sm text-slate-500">General contractors referenced from RFIs and submittals.</p>
            </div>
            <input value={contractorSearch} onChange={(event) => setContractorSearch(event.target.value)} placeholder="Search contractors" className="min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="ui-scroll max-h-[320px] overflow-auto rounded-lg border border-slate-200">
              <table className="ui-table min-w-full">
                <thead><tr className="bg-slate-100"><th className="border px-3 py-2 text-left">ID</th><th className="border px-3 py-2 text-left">Name</th><th className="border px-3 py-2 text-left">Actions</th></tr></thead>
                <tbody>
                  {filteredContractors.map((item) => (
                    <tr key={item.id}>
                      <td className="border px-3 py-2">{item.id}</td>
                      <td className="border px-3 py-2">{editingContractorId === item.id ? <input value={editingContractorName} onChange={(event) => setEditingContractorName(event.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" /> : item.name}</td>
                      <td className="border px-3 py-2">
                        <div className="flex gap-2">
                          {editingContractorId === item.id ? (
                            <>
                              <button type="button" onClick={async () => { const res = await updateContractor(token, item.id, { name: editingContractorName.trim() }); if (!res.ok) return setMessage('Failed to update contractor.'); setEditingContractorId(null); setEditingContractorName(''); setMessage('Contractor updated.'); await loadContacts() }} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">Save</button>
                              <button type="button" onClick={() => { setEditingContractorId(null); setEditingContractorName('') }} className="rounded bg-slate-200 px-2 py-1 text-xs">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => { setEditingContractorId(item.id); setEditingContractorName(item.name) }} className="rounded bg-slate-200 px-2 py-1 text-xs">Edit</button>
                              <button type="button" onClick={() => void handleDelete('Contractor', () => deleteContractor(token, item.id))} className="rounded bg-rose-600 px-2 py-1 text-xs text-white">Delete</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredContractors.length === 0 ? <tr><td colSpan={3} className="border px-3 py-8"><EmptyState title="No contractors found" description="Create one using the form on the right." /></td></tr> : null}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <form onSubmit={handleCreateContractor} className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Add Contractor</h4>
                <input value={contractorName} onChange={(event) => setContractorName(event.target.value)} placeholder="Contractor name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <PrimaryButton type="submit">Save Contractor</PrimaryButton>
              </form>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Subcontractors</h3>
              <p className="mt-1 text-sm text-slate-500">Trade partners used in submittal and RFI routing.</p>
            </div>
            <input value={subcontractorSearch} onChange={(event) => setSubcontractorSearch(event.target.value)} placeholder="Search subcontractors" className="min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="ui-scroll max-h-[320px] overflow-auto rounded-lg border border-slate-200">
              <table className="ui-table min-w-full">
                <thead><tr className="bg-slate-100"><th className="border px-3 py-2 text-left">ID</th><th className="border px-3 py-2 text-left">Name</th><th className="border px-3 py-2 text-left">Actions</th></tr></thead>
                <tbody>
                  {filteredSubcontractors.map((item) => (
                    <tr key={item.id}>
                      <td className="border px-3 py-2">{item.id}</td>
                      <td className="border px-3 py-2">{editingSubcontractorId === item.id ? <input value={editingSubcontractorName} onChange={(event) => setEditingSubcontractorName(event.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" /> : item.name}</td>
                      <td className="border px-3 py-2">
                        <div className="flex gap-2">
                          {editingSubcontractorId === item.id ? (
                            <>
                              <button type="button" onClick={async () => { const res = await updateSubcontractor(token, item.id, { name: editingSubcontractorName.trim() }); if (!res.ok) return setMessage('Failed to update subcontractor.'); setEditingSubcontractorId(null); setEditingSubcontractorName(''); setMessage('Subcontractor updated.'); await loadContacts() }} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">Save</button>
                              <button type="button" onClick={() => { setEditingSubcontractorId(null); setEditingSubcontractorName('') }} className="rounded bg-slate-200 px-2 py-1 text-xs">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => { setEditingSubcontractorId(item.id); setEditingSubcontractorName(item.name) }} className="rounded bg-slate-200 px-2 py-1 text-xs">Edit</button>
                              <button type="button" onClick={() => void handleDelete('Subcontractor', () => deleteSubcontractor(token, item.id))} className="rounded bg-rose-600 px-2 py-1 text-xs text-white">Delete</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSubcontractors.length === 0 ? <tr><td colSpan={3} className="border px-3 py-8"><EmptyState title="No subcontractors found" description="Create one using the form on the right." /></td></tr> : null}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <form onSubmit={handleCreateSubcontractor} className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">Add Subcontractor</h4>
                <input value={subcontractorName} onChange={(event) => setSubcontractorName(event.target.value)} placeholder="Subcontractor name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <PrimaryButton type="submit">Save Subcontractor</PrimaryButton>
              </form>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
