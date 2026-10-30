import { FormEvent, useEffect, useMemo, useState } from 'react'

import PrimaryButton from '../common/PrimaryButton'
import SectionHeader from '../common/SectionHeader'
import StatusBadge from '../common/StatusBadge'
import { cellInputClass, inputClass } from '../register/registerUi'
import { createMasterItem, fetchMasterItems, fetchRegisterMeta, responseDetail, updateMasterItem } from '../../services/registerService'
import type { MasterItem, RegisterItemFields, RegisterMeta } from '../../types/register'

type MasterListPanelProps = {
  token: string
  isAdmin: boolean
  setMessage: (message: string) => void
}

type MasterDraft = RegisterItemFields & { seen_on: string }

const EDITABLE_FIELDS: Array<keyof MasterDraft> = [
  'submittal_no', 'spec_section', 'description', 'discipline', 'submittal_type', 'reviewer', 'ahj', 'signed_sealed', 'long_lead',
  'inspection_related', 'notes', 'seen_on',
]

const emptyDraft: MasterDraft = {
  submittal_no: '', spec_section: '', description: '', discipline: '', submittal_type: '', reviewer: '', ahj: '',
  signed_sealed: false, long_lead: false, inspection_related: false, notes: '', seen_on: '',
}

const toDraft = (item: MasterItem): MasterDraft => Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, item[field]])) as MasterDraft

export default function MasterListPanel({ token, isAdmin, setMessage }: MasterListPanelProps) {
  const [items, setItems] = useState<MasterItem[]>([])
  const [meta, setMeta] = useState<RegisterMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [rowDraft, setRowDraft] = useState<MasterDraft>(emptyDraft)
  const [showNew, setShowNew] = useState(false)
  const [newDraft, setNewDraft] = useState<MasterDraft>(emptyDraft)

  useEffect(() => {
    void Promise.all([fetchMasterItems(token), fetchRegisterMeta(token)]).then(([records, metaRes]) => {
      setItems(records)
      if (metaRes.ok && metaRes.data) setMeta(metaRes.data)
      setLoading(false)
    })
  }, [token])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter((item) => {
      if (!showInactive && !item.is_active) return false
      if (!query) return true
      return `${item.submittal_no} ${item.description} ${item.discipline} ${item.reviewer} ${item.notes}`.toLowerCase().includes(query)
    })
  }, [items, search, showInactive])

  const replace = (updated: MasterItem) => setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))

  const saveRow = async (item: MasterItem) => {
    const original = toDraft(item)
    const payload = Object.fromEntries(EDITABLE_FIELDS.filter((field) => rowDraft[field] !== original[field]).map((field) => [field, rowDraft[field]]))
    if (!Object.keys(payload).length) return setEditingId(null)
    const res = await updateMasterItem(token, item.id, payload)
    if (!res.ok || !res.data) return setMessage(responseDetail(res.data, 'Failed to save master item.'))
    replace(res.data)
    setEditingId(null)
    setMessage(`Saved ${res.data.submittal_no}. New projects will use it.`)
  }

  const toggleActive = async (item: MasterItem) => {
    const res = await updateMasterItem(token, item.id, { is_active: !item.is_active })
    if (!res.ok || !res.data) return setMessage(responseDetail(res.data, 'Failed to update master item.'))
    replace(res.data)
    setMessage(res.data.is_active ? `${item.submittal_no} will be added to new projects.` : `${item.submittal_no} won't be added to new projects.`)
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    const res = await createMasterItem(token, newDraft)
    if (!res.ok || !res.data) return setMessage(responseDetail(res.data, 'Failed to add master item.'))
    const created = res.data
    setItems((prev) => [...prev, created].sort((a, b) => a.submittal_no.localeCompare(b.submittal_no, undefined, { numeric: true })))
    setNewDraft(emptyDraft)
    setShowNew(false)
    setMessage(`Added ${created.submittal_no}. Existing projects have it switched off; new projects get it switched on.`)
  }

  const select = (value: string, options: string[], onChange: (value: string) => void, className: string) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="" />
      {Array.from(new Set([...options, value].filter(Boolean))).map((option) => <option key={option}>{option}</option>)}
    </select>
  )

  return (
    <section className="ui-panel slide-in">
      <SectionHeader
        title="Master Submittal List"
        subtitle={`The template every project's register starts from. ${items.filter((item) => item.is_active).length} active items.`}
        actions={isAdmin ? <PrimaryButton type="button" onClick={() => setShowNew((prev) => !prev)}>{showNew ? 'Cancel' : 'Add item'}</PrimaryButton> : null}
      />
      <p className="mt-2 text-sm text-slate-600">
        Changes here apply to projects created from now on. Existing project registers keep their own copy, so edit those from the project&apos;s register.
        {isAdmin ? null : ' Only admins can change this list.'}
      </p>

      {showNew && isAdmin ? (
        <form onSubmit={(event) => void handleCreate(event)} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
          <label className="text-sm text-slate-700">Submittal No.
            <input required value={newDraft.submittal_no} onChange={(e) => setNewDraft({ ...newDraft, submittal_no: e.target.value })} placeholder="08 44 00-03" className={inputClass} />
          </label>
          <label className="text-sm text-slate-700">Spec section
            <input value={newDraft.spec_section} onChange={(e) => setNewDraft({ ...newDraft, spec_section: e.target.value })} className={inputClass} />
          </label>
          <label className="text-sm text-slate-700">Description
            <input required value={newDraft.description} onChange={(e) => setNewDraft({ ...newDraft, description: e.target.value })} className={inputClass} />
          </label>
          <label className="text-sm text-slate-700">Discipline
            {select(newDraft.discipline, meta?.disciplines ?? [], (value) => setNewDraft({ ...newDraft, discipline: value }), inputClass)}
          </label>
          <label className="text-sm text-slate-700">Type
            {select(newDraft.submittal_type, meta?.submittal_types ?? [], (value) => setNewDraft({ ...newDraft, submittal_type: value }), inputClass)}
          </label>
          <label className="text-sm text-slate-700">Reviewer
            {select(newDraft.reviewer, meta?.reviewers ?? [], (value) => setNewDraft({ ...newDraft, reviewer: value }), inputClass)}
          </label>
          <label className="text-sm text-slate-700">AHJ / agency
            <input value={newDraft.ahj} onChange={(e) => setNewDraft({ ...newDraft, ahj: e.target.value })} className={inputClass} />
          </label>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700 md:col-span-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={newDraft.signed_sealed} onChange={(e) => setNewDraft({ ...newDraft, signed_sealed: e.target.checked })} />Signed &amp; sealed</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={newDraft.long_lead} onChange={(e) => setNewDraft({ ...newDraft, long_lead: e.target.checked })} />Long lead</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={newDraft.inspection_related} onChange={(e) => setNewDraft({ ...newDraft, inspection_related: e.target.checked })} />Inspection related</label>
          </div>
          <div className="md:col-span-3">
            <PrimaryButton type="submit">Add to master list</PrimaryButton>
          </div>
        </form>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search master list"
          aria-label="Search master list"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
          Show retired items
        </label>
      </div>

      {loading ? <p className="mt-4 text-sm text-slate-600">Loading…</p> : (
        <div className="ui-scroll mt-3 overflow-x-auto">
          <table className="ui-table min-w-[1200px]">
            <thead>
              <tr className="bg-slate-100">
                {['Submittal No.', 'Description', 'Discipline', 'Type', 'Reviewer', 'AHJ', 'Flags', 'Notes', ''].map((header) => (
                  <th key={header} className="border px-3 py-2 text-left">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) =>
                editingId === item.id ? (
                  <tr key={item.id} className="bg-amber-50/40 align-top">
                    <td className="border px-2 py-2"><input value={rowDraft.submittal_no} onChange={(e) => setRowDraft({ ...rowDraft, submittal_no: e.target.value })} className={cellInputClass} /></td>
                    <td className="border px-2 py-2"><input value={rowDraft.description} onChange={(e) => setRowDraft({ ...rowDraft, description: e.target.value })} className={`${cellInputClass} min-w-[16rem]`} /></td>
                    <td className="border px-2 py-2">{select(rowDraft.discipline, meta?.disciplines ?? [], (value) => setRowDraft({ ...rowDraft, discipline: value }), cellInputClass)}</td>
                    <td className="border px-2 py-2">{select(rowDraft.submittal_type, meta?.submittal_types ?? [], (value) => setRowDraft({ ...rowDraft, submittal_type: value }), cellInputClass)}</td>
                    <td className="border px-2 py-2">{select(rowDraft.reviewer, meta?.reviewers ?? [], (value) => setRowDraft({ ...rowDraft, reviewer: value }), cellInputClass)}</td>
                    <td className="border px-2 py-2"><input value={rowDraft.ahj} onChange={(e) => setRowDraft({ ...rowDraft, ahj: e.target.value })} className={cellInputClass} /></td>
                    <td className="border px-2 py-2 text-xs">
                      <label className="flex items-center gap-1"><input type="checkbox" checked={rowDraft.signed_sealed} onChange={(e) => setRowDraft({ ...rowDraft, signed_sealed: e.target.checked })} />S&amp;S</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={rowDraft.long_lead} onChange={(e) => setRowDraft({ ...rowDraft, long_lead: e.target.checked })} />Long lead</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={rowDraft.inspection_related} onChange={(e) => setRowDraft({ ...rowDraft, inspection_related: e.target.checked })} />Inspection</label>
                    </td>
                    <td className="border px-2 py-2"><textarea value={rowDraft.notes} onChange={(e) => setRowDraft({ ...rowDraft, notes: e.target.value })} rows={2} className={cellInputClass} /></td>
                    <td className="whitespace-nowrap border px-2 py-2">
                      <div className="flex gap-1">
                        <PrimaryButton type="button" onClick={() => void saveRow(item)}>Save</PrimaryButton>
                        <PrimaryButton type="button" variant="secondary" onClick={() => setEditingId(null)}>Cancel</PrimaryButton>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className={item.is_active ? '' : 'text-slate-400'}>
                    <td className="whitespace-nowrap border px-3 py-2 font-medium">{item.submittal_no}</td>
                    <td className="border px-3 py-2">{item.description}</td>
                    <td className="border px-3 py-2 text-sm">{item.discipline}</td>
                    <td className="border px-3 py-2 text-sm">{item.submittal_type}</td>
                    <td className="border px-3 py-2 text-sm">{item.reviewer}</td>
                    <td className="border px-3 py-2 text-sm">{item.ahj}</td>
                    <td className="border px-3 py-2 text-xs">
                      {[item.signed_sealed && 'Signed & sealed', item.long_lead && 'Long lead', item.inspection_related && 'Inspection'].filter(Boolean).join(', ')}
                    </td>
                    <td className="border px-3 py-2 text-sm">{item.notes}</td>
                    <td className="whitespace-nowrap border px-3 py-2">
                      {isAdmin ? (
                        <div className="flex gap-1">
                          <PrimaryButton
                            type="button"
                            variant="secondary"
                            disabled={editingId !== null}
                            onClick={() => {
                              setRowDraft(toDraft(item))
                              setEditingId(item.id)
                            }}
                          >
                            Edit
                          </PrimaryButton>
                          <PrimaryButton type="button" variant={item.is_active ? 'danger' : 'secondary'} onClick={() => void toggleActive(item)}>
                            {item.is_active ? 'Retire' : 'Restore'}
                          </PrimaryButton>
                        </div>
                      ) : item.is_active ? null : <StatusBadge label="Retired" />}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
