import { FormEvent, useEffect, useMemo, useState } from 'react'

import { EOR_TYPES } from '../../app/eorTypes'
import type { EorType } from '../../app/eorTypes'
import { toNullableString } from '../../app/formUtils'
import { createSubmittal, deleteSubmittal, fetchAors, fetchEors, updateSubmittal } from '../../services/workspaceService'
import type { AorRecord, EorRecord, ProjectRecord, SubmittalRecord } from '../../types/workspace'

type SubmittalsPanelProps = {
  token: string
  projects: ProjectRecord[]
  submittals: SubmittalRecord[]
  setMessage: (message: string) => void
  refreshWorkspace: (token: string) => Promise<void>
}

const DIVISION_CSI_GROUPS = [
  {
    label: 'Procurement & Contracting Requirements',
    options: ['Division 00 — Procurement and Contracting Requirements'],
  },
  {
    label: 'Specifications Group: Facility Construction Subgroup',
    options: [
      'Division 02 — Existing Conditions',
      'Division 03 — Concrete',
      'Division 04 — Masonry',
      'Division 05 — Metals',
      'Division 06 — Wood, Plastics, and Composites',
      'Division 07 — Thermal and Moisture Protection',
      'Division 08 — Openings',
      'Division 09 — Finishes',
      'Division 10 — Specialties',
      'Division 11 — Equipment',
      'Division 12 — Furnishings',
      'Division 13 — Special Construction',
      'Division 14 — Conveying Equipment',
    ],
  },
  {
    label: 'Specifications Group: Facility Services Subgroup',
    options: [
      'Division 21 — Fire Suppression',
      'Division 22 — Plumbing',
      'Division 23 — Heating, Ventilating, and Air Conditioning (HVAC)',
      'Division 25 — Integrated Automation',
      'Division 26 — Electrical',
      'Division 27 — Communications',
      'Division 28 — Electronic Safety and Security',
    ],
  },
  {
    label: 'Specifications Group: Site & Infrastructure Subgroup',
    options: [
      'Division 31 — Earthwork',
      'Division 32 — Exterior Improvements',
      'Division 33 — Utilities',
      'Division 34 — Transportation',
      'Division 35 — Waterway and Marine Construction',
    ],
  },
] as const

const ALL_DIVISION_CSI_OPTIONS: string[] = DIVISION_CSI_GROUPS.flatMap((group) => group.options)
const OVERALL_STATUS_OPTIONS = ['Approved', 'Under Revision', 'Not Approved'] as const
const MULTI_VALUE_SEPARATOR = ' | '
const todayIsoDate = () => new Date().toISOString().slice(0, 10)

function splitMultiValues(value: string | null): string[] {
  return String(value || '')
    .split(MULTI_VALUE_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean)
}

function addUniqueMultiValue(current: string | null, nextValue: string): string {
  const trimmed = nextValue.trim()
  if (!trimmed) return String(current || '')
  const currentValues = splitMultiValues(current)
  if (currentValues.includes(trimmed)) return currentValues.join(MULTI_VALUE_SEPARATOR)
  return [...currentValues, trimmed].join(MULTI_VALUE_SEPARATOR)
}

function removeMultiValue(current: string | null, target: string): string {
  const next = splitMultiValues(current).filter((item) => item !== target)
  return next.join(MULTI_VALUE_SEPARATOR)
}

const emptyForm: Omit<SubmittalRecord, 'id'> = {
  project_id: '',
  division_csi: '',
  submittal_number: '',
  description: '',
  contractor: '',
  start_date: '',
  date_received: '',
  sent_to_aor: '',
  sent_to_eor: '',
  sent_to_date: '',
  approved_by: '',
  approval_status: '',
  revision: '',
  due_date: '',
  days_pending: null,
  overall_status: '',
  responsible: '',
  workflow_stage: '',
  notes: '',
}

export default function SubmittalsPanel({ token, projects, submittals, setMessage, refreshWorkspace }: SubmittalsPanelProps) {
  const [form, setForm] = useState<Omit<SubmittalRecord, 'id'>>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [projectSearch, setProjectSearch] = useState('')
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false)
  const [aors, setAors] = useState<AorRecord[]>([])
  const [eors, setEors] = useState<EorRecord[]>([])
  const [sentToAorInput, setSentToAorInput] = useState('')
  const [sentToEorInput, setSentToEorInput] = useState('')
  const [showAorSuggestions, setShowAorSuggestions] = useState(false)
  const [showEorSuggestions, setShowEorSuggestions] = useState(false)
  const [selectedEorType, setSelectedEorType] = useState<EorType>('Civil EOR')
  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.project_id, p.project_name])),
    [projects]
  )
  const sortedAors = useMemo(() => [...aors].sort((a, b) => a.name.localeCompare(b.name)), [aors])
  const filteredAors = useMemo(() => {
    const query = sentToAorInput.trim().toLowerCase()
    if (query.length < 1) return []
    return sortedAors.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 8)
  }, [sentToAorInput, sortedAors])
  const filteredEors = useMemo(() => {
    const query = sentToEorInput.trim().toLowerCase()
    if (query.length < 1) return []
    return eors
      .filter((item) => item.type === selectedEorType && item.name.toLowerCase().includes(query))
      .slice(0, 8)
  }, [eors, selectedEorType, sentToEorInput])

  useEffect(() => {
    let mounted = true
    const loadLists = async () => {
      const [nextAors, nextEors] = await Promise.all([fetchAors(token), fetchEors(token)])
      if (!mounted) return
      setAors(nextAors)
      setEors(nextEors)
    }
    loadLists()
    return () => { mounted = false }
  }, [token])
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.project_name.localeCompare(b.project_name)),
    [projects]
  )
  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase()
    if (query.length < 1) return []
    return sortedProjects.filter((project) => project.project_name.toLowerCase().includes(query)).slice(0, 8)
  }, [projectSearch, sortedProjects])
  const approvedByOptions = useMemo(() => {
    const options: string[] = []
    if (form.sent_to_aor?.trim()) options.push(form.sent_to_aor.trim())
    options.push(...splitMultiValues(form.sent_to_eor))
    return Array.from(new Set(options))
  }, [form.sent_to_aor, form.sent_to_eor])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.project_id) return setMessage('Select a project first.')

    const payload = {
      project_id: toNullableString(form.project_id),
      division_csi: toNullableString(form.division_csi),
      submittal_number: toNullableString(form.submittal_number),
      description: toNullableString(form.description),
      contractor: toNullableString(form.contractor),
      start_date: toNullableString(form.start_date),
      date_received: toNullableString(form.date_received),
      sent_to_aor: toNullableString(form.sent_to_aor),
      sent_to_eor: toNullableString(form.sent_to_eor),
      sent_to_date: toNullableString(form.sent_to_date),
      approved_by: toNullableString(form.approved_by),
      approval_status: toNullableString(form.approval_status),
      revision: toNullableString(form.revision),
      due_date: toNullableString(form.due_date),
      days_pending: null,
      overall_status: toNullableString(form.overall_status),
      responsible: toNullableString(form.responsible),
      workflow_stage: toNullableString(form.workflow_stage),
      notes: toNullableString(form.notes),
    }

    const res = editingId ? await updateSubmittal(token, editingId, payload) : await createSubmittal(token, payload)
    if (!res.ok) return setMessage('Failed to save submittal.')
    setMessage(editingId ? 'Submittal updated.' : 'Submittal created.')
    setEditingId(null)
    setForm(emptyForm)
    setProjectSearch('')
    setSentToAorInput('')
    setSentToEorInput('')
    setSelectedEorType('Civil EOR')
    await refreshWorkspace(token)
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{editingId ? 'Edit Submittal' : 'New Submittal'}</h2>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">Project (search by name)
          <div className="relative mt-1">
            <input
              value={projectSearch}
              onFocus={() => setShowProjectSuggestions(true)}
              onBlur={() => setTimeout(() => setShowProjectSuggestions(false), 120)}
              onChange={(e) => {
                setProjectSearch(e.target.value)
                setForm((p) => ({ ...p, project_id: '' }))
                setShowProjectSuggestions(true)
              }}
              placeholder="Type project name"
              className="w-full rounded border px-2 py-2"
            />
            {showProjectSuggestions ? (
              <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded border border-slate-200 bg-white shadow-md">
                {projectSearch.trim().length < 1 ? null : filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <button
                      key={project.project_id}
                      type="button"
                      onMouseDown={() => {
                        setProjectSearch(project.project_name)
                        setForm((p) => ({ ...p, project_id: project.project_id }))
                        setShowProjectSuggestions(false)
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                    >
                      {project.project_name}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-slate-500">No matches</p>
                )}
              </div>
            ) : null}
          </div>
          {form.project_id ? <p className="mt-1 text-xs text-slate-500">Selected project</p> : null}
        </label>
        <label className="text-sm">Submittal #
          <input value={form.submittal_number ?? ''} onChange={(e) => setForm((p) => ({ ...p, submittal_number: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Division CSI
          <select
            value={form.division_csi ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, division_csi: e.target.value }))}
            className="mt-1 w-full rounded border px-2 py-2"
          >
            <option value="">Select Division CSI</option>
            {form.division_csi && !ALL_DIVISION_CSI_OPTIONS.includes(form.division_csi) ? (
              <option value={form.division_csi}>{form.division_csi}</option>
            ) : null}
            {DIVISION_CSI_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="text-sm">Overall Status
          <select
            value={form.overall_status ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, overall_status: e.target.value }))}
            className="mt-1 w-full rounded border px-2 py-2"
          >
            <option value="">Select overall status</option>
            {OVERALL_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="text-sm lg:col-span-2">Description
          <textarea
            value={form.description ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={4}
            className="mt-1 w-full rounded border px-2 py-2"
          />
        </label>
        <div className="text-sm lg:col-span-2">
          <p className="font-medium text-slate-700">Sent To</p>
          <div className="mt-2">
            <label className="text-xs text-slate-600">AOR</label>
            <div className="relative mt-1">
              <input
                value={sentToAorInput}
                onFocus={() => setShowAorSuggestions(true)}
                onBlur={() => setTimeout(() => setShowAorSuggestions(false), 120)}
                onChange={(e) => {
                  setSentToAorInput(e.target.value)
                  setForm((p) => ({ ...p, sent_to_aor: e.target.value }))
                  setShowAorSuggestions(true)
                }}
                placeholder="Search AOR"
                className="w-full rounded border px-2 py-2"
              />
              {showAorSuggestions ? (
                <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded border border-slate-200 bg-white shadow-md">
                  {sentToAorInput.trim().length < 1 ? null : filteredAors.length > 0 ? (
                    filteredAors.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={() => {
                          setSentToAorInput(item.name)
                          setForm((p) => ({ ...p, sent_to_aor: item.name, sent_to_date: p.sent_to_date || todayIsoDate() }))
                          setShowAorSuggestions(false)
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                      >
                        {item.name}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-slate-500">No matches</p>
                  )}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                const trimmed = sentToAorInput.trim()
                if (!trimmed) return
                setForm((p) => ({ ...p, sent_to_aor: trimmed, sent_to_date: p.sent_to_date || todayIsoDate() }))
                setShowAorSuggestions(false)
              }}
              className="mt-2 rounded bg-brand-700 px-3 py-2 text-xs font-semibold text-white"
            >
              Add AOR
            </button>
            {form.sent_to_aor ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  {form.sent_to_aor}
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, sent_to_aor: '' }))}
                    className="rounded-full bg-slate-200 px-1 text-[10px] text-slate-600"
                  >
                    x
                  </button>
                </span>
              </div>
            ) : null}
          </div>
          <div className="mt-3">
            <label className="text-xs text-slate-600">EOR</label>
            <select
              value={selectedEorType}
              onChange={(e) => setSelectedEorType(e.target.value as EorType)}
              className="mt-1 w-full rounded border px-2 py-2"
            >
              {EOR_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <div className="relative mt-2">
              <input
                value={sentToEorInput}
                onFocus={() => setShowEorSuggestions(true)}
                onBlur={() => setTimeout(() => setShowEorSuggestions(false), 120)}
                onChange={(e) => {
                  setSentToEorInput(e.target.value)
                  setShowEorSuggestions(true)
                }}
                placeholder={`Search ${selectedEorType}`}
                className="w-full rounded border px-2 py-2"
              />
              {showEorSuggestions ? (
                <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded border border-slate-200 bg-white shadow-md">
                  {sentToEorInput.trim().length < 1 ? null : filteredEors.length > 0 ? (
                    filteredEors.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={() => {
                          setSentToEorInput(item.name)
                          setShowEorSuggestions(false)
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                      >
                        {item.name}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-slate-500">No matches</p>
                  )}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                const trimmed = sentToEorInput.trim()
                if (!trimmed) return
                const formatted = `${selectedEorType}: ${trimmed}`
                const next = addUniqueMultiValue(form.sent_to_eor, formatted)
                setForm((p) => ({ ...p, sent_to_eor: next, sent_to_date: p.sent_to_date || todayIsoDate() }))
                setSentToEorInput('')
                setShowEorSuggestions(false)
              }}
              className="mt-2 rounded bg-brand-700 px-3 py-2 text-xs font-semibold text-white"
            >
              Add EOR
            </button>
            {form.sent_to_eor ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {splitMultiValues(form.sent_to_eor).map((item) => (
                  <span key={item} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {item}
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, sent_to_eor: removeMultiValue(p.sent_to_eor, item) }))}
                      className="rounded-full bg-slate-200 px-1 text-[10px] text-slate-600"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <label className="text-sm">Sent To Date
          <input
            type="date"
            value={form.sent_to_date ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, sent_to_date: e.target.value }))}
            className="mt-1 w-full rounded border px-2 py-2"
          />
        </label>
        <label className="text-sm">Approved By
          <select
            value={form.approved_by ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, approved_by: e.target.value }))}
            className="mt-1 w-full rounded border px-2 py-2"
          >
            <option value="">Select approver</option>
            {form.approved_by && !approvedByOptions.includes(form.approved_by) ? (
              <option value={form.approved_by}>{form.approved_by}</option>
            ) : null}
            {approvedByOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">Due Date
          <input type="date" value={form.due_date ?? ''} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Start Date
          <input type="date" value={form.start_date ?? ''} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <div className="flex gap-2 lg:col-span-4">
          <button type="submit" className="rounded bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
            {editingId ? 'Update Submittal' : 'Create Submittal'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null)
                setForm(emptyForm)
                setProjectSearch('')
                setSentToAorInput('')
                setSentToEorInput('')
                setSelectedEorType('Civil EOR')
              }}
              className="rounded bg-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead><tr className="bg-slate-100">{['ID', 'Project', 'Submittal #', 'Overall Status', 'Due Date', 'Actions'].map((h) => <th key={h} className="border px-3 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {submittals.map((item) => (
              <tr key={item.id}>
                <td className="border px-3 py-2">{item.id}</td>
                <td className="border px-3 py-2">{item.project_id ? (projectNameById[item.project_id] ?? 'Unknown Project') : ''}</td>
                <td className="border px-3 py-2">{item.submittal_number}</td>
                <td className="border px-3 py-2">{item.overall_status}</td>
                <td className="border px-3 py-2">{item.due_date ?? ''}</td>
                <td className="border px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(item.id)
                        setForm({ ...item })
                        setProjectSearch(item.project_id ? (projectNameById[item.project_id] ?? '') : '')
                        setSentToAorInput(item.sent_to_aor ?? '')
                        setSentToEorInput('')
                        setSelectedEorType('Civil EOR')
                      }}
                      className="rounded bg-slate-200 px-2 py-1 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete submittal ${item.id}?`)) return
                        const res = await deleteSubmittal(token, item.id)
                        if (!res.ok) return setMessage('Failed to delete submittal.')
                        await refreshWorkspace(token)
                      }}
                      className="rounded bg-rose-600 px-2 py-1 text-xs text-white"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
