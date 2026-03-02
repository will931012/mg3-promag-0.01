import { FormEvent, useEffect, useMemo, useState } from 'react'

import { EOR_TYPES } from '../../app/eorTypes'
import type { EorType } from '../../app/eorTypes'
import { toNullableString } from '../../app/formUtils'
import { createSubcontractor, createSubmittal, deleteSubmittal, fetchSubcontractors, updateSubmittal } from '../../services/workspaceService'
import type { ProjectRecord, SubcontractorRecord, SubmittalRecord } from '../../types/workspace'
import EmptyState from '../common/EmptyState'
import PrimaryButton from '../common/PrimaryButton'
import SectionHeader from '../common/SectionHeader'
import StatusBadge from '../common/StatusBadge'

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
const NOTES_SEPARATOR = '\n\n'
const getSubmittalLifecycleStatus = (status: string | null): 'opened' | 'closed' => {
  const text = String(status || '').toLowerCase()
  if (!text) return 'opened'
  return text.includes('approved') || text.includes('closed') || text.includes('complete') || text.includes('resolved')
    ? 'closed'
    : 'opened'
}

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

function splitNotes(value: string | null): string[] {
  return String(value || '')
    .split(NOTES_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean)
}

function addNote(current: string | null, nextValue: string): string {
  const trimmed = nextValue.trim()
  if (!trimmed) return String(current || '')
  return [...splitNotes(current), trimmed].join(NOTES_SEPARATOR)
}

function removeNote(current: string | null, note: string): string {
  return splitNotes(current).filter((item) => item !== note).join(NOTES_SEPARATOR)
}

const emptyForm: Omit<SubmittalRecord, 'id'> = {
  project_id: '',
  division_csi: '',
  submittal_number: '',
  subject: '',
  contractor: '',
  date_received: '',
  sent_to_aor: '',
  sent_to_eor: '',
  sent_to_subcontractor: '',
  sent_to_date: '',
  approvers: '',
  approval_status: '',
  lifecycle_status: 'opened',
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
  const [showForm, setShowForm] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false)
  const [subcontractors, setSubcontractors] = useState<SubcontractorRecord[]>([])
  const [selectedProjectEorOption, setSelectedProjectEorOption] = useState('')
  const [sentToSubcontractorInput, setSentToSubcontractorInput] = useState('')
  const [showSubcontractorSuggestions, setShowSubcontractorSuggestions] = useState(false)
  const [selectedEorType, setSelectedEorType] = useState<EorType>('Civil EOR')
  const [approverInput, setApproverInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [showSubcontractorModal, setShowSubcontractorModal] = useState(false)
  const [newSubcontractorName, setNewSubcontractorName] = useState('')
  const [listSearch, setListSearch] = useState('')
  const [listStatusFilter, setListStatusFilter] = useState<'all' | 'opened' | 'closed'>('all')
  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.project_id, p.project_name])),
    [projects]
  )
  const selectedProject = useMemo(
    () => projects.find((project) => project.project_id === form.project_id) ?? null,
    [projects, form.project_id]
  )
  const projectAorOption = useMemo(() => String(selectedProject?.aor || '').trim(), [selectedProject])
  const projectEorOptions = useMemo(
    () =>
      splitMultiValues(selectedProject?.eor ?? '').map((item) => {
        const [rawType, ...rest] = item.split(':')
        return {
          raw: item,
          type: rawType?.trim() as EorType,
          name: rest.join(':').trim(),
        }
      }),
    [selectedProject]
  )
  const filteredProjectEorOptions = useMemo(
    () => projectEorOptions.filter((item) => item.type === selectedEorType),
    [projectEorOptions, selectedEorType]
  )
  const sortedSubcontractors = useMemo(() => [...subcontractors].sort((a, b) => a.name.localeCompare(b.name)), [subcontractors])
  const filteredSubcontractors = useMemo(() => {
    const query = sentToSubcontractorInput.trim().toLowerCase()
    if (query.length < 1) return []
    return sortedSubcontractors.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 8)
  }, [sentToSubcontractorInput, sortedSubcontractors])

  useEffect(() => {
    let mounted = true
    const loadLists = async () => {
      const nextSubcontractors = await fetchSubcontractors(token)
      if (!mounted) return
      setSubcontractors(nextSubcontractors)
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
  const approverOptions = useMemo(() => {
    const options: string[] = []
    if (form.sent_to_aor?.trim()) options.push(form.sent_to_aor.trim())
    options.push(...splitMultiValues(form.sent_to_eor))
    if (form.sent_to_subcontractor?.trim()) options.push(form.sent_to_subcontractor.trim())
    return Array.from(new Set(options))
  }, [form.sent_to_aor, form.sent_to_eor, form.sent_to_subcontractor])
  const filteredTableSubmittals = useMemo(() => {
    const query = listSearch.trim().toLowerCase()
    return submittals.filter((item) => {
      const lifecycle = String(item.lifecycle_status || '').toLowerCase()
      const statusPass =
        listStatusFilter === 'all' ? true : listStatusFilter === 'opened' ? lifecycle !== 'closed' : lifecycle === 'closed'
      const searchPass = query.length === 0
        ? true
        : `${item.submittal_number || ''} ${item.subject || ''} ${item.project_id || ''}`.toLowerCase().includes(query)
      return statusPass && searchPass
    })
  }, [submittals, listSearch, listStatusFilter])

  const handleCreateSubcontractor = async () => {
    const name = newSubcontractorName.trim()
    if (!name) return setMessage('Subcontractor name is required.')
    const res = await createSubcontractor(token, { name })
    const createdSubcontractor = res.data
    if (!res.ok || !createdSubcontractor) return setMessage('Failed to create subcontractor.')
    const nextSubcontractors = [...subcontractors, createdSubcontractor].sort((a, b) => a.name.localeCompare(b.name))
    setSubcontractors(nextSubcontractors)
    setSentToSubcontractorInput(createdSubcontractor.name)
    setForm((p) => ({ ...p, sent_to_subcontractor: createdSubcontractor.name }))
    setNewSubcontractorName('')
    setShowSubcontractorModal(false)
    setMessage('Subcontractor created.')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.project_id) return setMessage('Select a project first.')

    const payload = {
      project_id: toNullableString(form.project_id),
      division_csi: toNullableString(form.division_csi),
      submittal_number: toNullableString(form.submittal_number),
      subject: toNullableString(form.subject),
      contractor: toNullableString(form.contractor),
      date_received: toNullableString(form.date_received),
      sent_to_aor: toNullableString(form.sent_to_aor),
      sent_to_eor: toNullableString(form.sent_to_eor),
      sent_to_subcontractor: toNullableString(form.sent_to_subcontractor),
      sent_to_date: toNullableString(form.sent_to_date),
      approvers: toNullableString(form.approvers),
      approval_status: toNullableString(form.approval_status),
      lifecycle_status: getSubmittalLifecycleStatus(form.overall_status || form.approval_status),
      revision: toNullableString(form.revision),
      due_date: toNullableString(form.due_date),
      days_pending: null,
      overall_status: toNullableString(form.overall_status),
      responsible: toNullableString(form.responsible),
      workflow_stage: toNullableString(form.workflow_stage),
      notes: toNullableString(form.notes),
    }

    const res = editingId ? await updateSubmittal(token, editingId, payload) : await createSubmittal(token, payload)
    if (!res.ok) {
      const detail = typeof res.data === 'object' && res.data && 'detail' in res.data
        ? String((res.data as { detail?: unknown }).detail ?? '')
        : ''
      return setMessage(detail || 'Failed to save submittal.')
    }
    setMessage(editingId ? 'Submittal updated.' : 'Submittal created.')
    setEditingId(null)
    setForm(emptyForm)
    setProjectSearch('')
    setSelectedProjectEorOption('')
    setSentToSubcontractorInput('')
    setApproverInput('')
    setNoteInput('')
    setSelectedEorType('Civil EOR')
    setShowForm(false)
    await refreshWorkspace(token)
  }

  return (
    <section className="ui-panel slide-in">
      <SectionHeader
        title={editingId ? 'Edit Submittal' : 'Submittals'}
        subtitle="Track open/closed progress and due dates with searchable lists."
        actions={
          <PrimaryButton
            type="button"
            onClick={() => {
              if (showForm && !editingId) {
                setShowForm(false)
                return
              }
              setEditingId(null)
              setForm(emptyForm)
              setProjectSearch('')
              setSelectedProjectEorOption('')
              setSentToSubcontractorInput('')
              setApproverInput('')
              setNoteInput('')
              setSelectedEorType('Civil EOR')
              setShowForm(true)
            }}
          >
            {showForm ? 'Hide Form' : 'Add Submittal'}
          </PrimaryButton>
        }
      />
      {showForm ? (
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">Project (search by name)
          <div className="relative mt-1">
            <input
              value={projectSearch}
              onFocus={() => setShowProjectSuggestions(true)}
              onBlur={() => setTimeout(() => setShowProjectSuggestions(false), 120)}
              onChange={(e) => {
                setProjectSearch(e.target.value)
                setForm((p) => ({ ...p, project_id: '', sent_to_aor: '', sent_to_eor: '' }))
                setSelectedProjectEorOption('')
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
                        setForm((p) => ({ ...p, project_id: project.project_id, sent_to_aor: '', sent_to_eor: '' }))
                        setSelectedProjectEorOption('')
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
        <label className="text-sm lg:col-span-2">Subject
          <input
            value={form.subject ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
            className="mt-1 w-full rounded border px-2 py-2"
          />
        </label>
        <div className="text-sm lg:col-span-2">
          <p className="font-medium text-slate-700">Sent To</p>
          <div className="mt-2">
            <label className="text-xs text-slate-600">AOR</label>
            <select
              value={form.sent_to_aor ?? ''}
              onChange={(e) => {
                const nextValue = e.target.value
                setForm((p) => ({ ...p, sent_to_aor: nextValue, sent_to_date: nextValue ? p.sent_to_date || todayIsoDate() : p.sent_to_date }))
              }}
              className="mt-1 w-full rounded border px-2 py-2"
            >
              <option value="">Select AOR from project</option>
              {projectAorOption ? <option value={projectAorOption}>{projectAorOption}</option> : null}
            </select>
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
            <select
              value={selectedProjectEorOption}
              onChange={(e) => setSelectedProjectEorOption(e.target.value)}
              className="mt-2 w-full rounded border px-2 py-2"
            >
              <option value="">Select EOR from project</option>
              {filteredProjectEorOptions.map((item) => (
                <option key={item.raw} value={item.raw}>{item.raw}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                if (!selectedProjectEorOption) return
                const next = addUniqueMultiValue(form.sent_to_eor, selectedProjectEorOption)
                setForm((p) => ({ ...p, sent_to_eor: next, sent_to_date: p.sent_to_date || todayIsoDate() }))
                setSelectedProjectEorOption('')
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
          <div className="mt-3">
            <label className="text-xs text-slate-600">Subcontractor</label>
            <div className="relative mt-1">
              <input
                value={sentToSubcontractorInput}
                onFocus={() => setShowSubcontractorSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSubcontractorSuggestions(false), 120)}
                onChange={(e) => {
                  setSentToSubcontractorInput(e.target.value)
                  setForm((p) => ({ ...p, sent_to_subcontractor: '' }))
                  setShowSubcontractorSuggestions(true)
                }}
                placeholder="Search Subcontractor"
                className="w-full rounded border px-2 py-2"
              />
              {showSubcontractorSuggestions ? (
                <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded border border-slate-200 bg-white shadow-md">
                  {sentToSubcontractorInput.trim().length < 1 ? null : filteredSubcontractors.length > 0 ? (
                    filteredSubcontractors.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={() => {
                          setSentToSubcontractorInput(item.name)
                          setForm((p) => ({ ...p, sent_to_subcontractor: item.name }))
                          setShowSubcontractorSuggestions(false)
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
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const trimmed = sentToSubcontractorInput.trim()
                  if (!trimmed) return
                  const existing = subcontractors.find((item) => item.name.toLowerCase() === trimmed.toLowerCase())
                  if (!existing) {
                    setMessage('Subcontractor must exist in DB. Select one from suggestions or create it first.')
                    return
                  }
                  setSentToSubcontractorInput(existing.name)
                  setForm((p) => ({ ...p, sent_to_subcontractor: existing.name }))
                  setShowSubcontractorSuggestions(false)
                }}
                className="rounded bg-brand-700 px-3 py-2 text-xs font-semibold text-white"
              >
                Add Subcontractor
              </button>
              <button
                type="button"
                onClick={() => setShowSubcontractorModal(true)}
                className="rounded bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Add Subcontractor to DB
              </button>
            </div>
            {form.sent_to_subcontractor ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  {form.sent_to_subcontractor}
                  <button
                    type="button"
                    onClick={() => {
                      setForm((p) => ({ ...p, sent_to_subcontractor: '' }))
                      setSentToSubcontractorInput('')
                    }}
                    className="rounded-full bg-slate-200 px-1 text-[10px] text-slate-600"
                  >
                    x
                  </button>
                </span>
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
        <div className="text-sm">
          <label className="text-sm">Approvers</label>
          <select
            value={approverInput}
            onChange={(e) => setApproverInput(e.target.value)}
            className="mt-1 w-full rounded border px-2 py-2"
          >
            <option value="">Select approver from Sent To</option>
            {approverOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              const next = addUniqueMultiValue(form.approvers, approverInput)
              setForm((p) => ({ ...p, approvers: next }))
              setApproverInput('')
            }}
            className="mt-2 rounded bg-brand-700 px-3 py-2 text-xs font-semibold text-white"
          >
            Add Approver
          </button>
          {form.approvers ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {splitMultiValues(form.approvers).map((item) => (
                <span key={item} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  {item}
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, approvers: removeMultiValue(p.approvers, item) }))}
                    className="rounded-full bg-slate-200 px-1 text-[10px] text-slate-600"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <label className="text-sm">Due Date
          <input type="date" value={form.due_date ?? ''} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <div className="text-sm lg:col-span-2">
          <label className="text-sm">Notes</label>
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            rows={3}
            placeholder="Write note"
            className="mt-1 w-full rounded border px-2 py-2"
          />
          <button
            type="button"
            onClick={() => {
              setForm((p) => ({ ...p, notes: addNote(p.notes, noteInput) }))
              setNoteInput('')
            }}
            className="mt-2 rounded bg-brand-700 px-3 py-2 text-xs font-semibold text-white"
          >
            Add Note
          </button>
          {form.notes ? (
            <div className="mt-2 space-y-2">
              {splitNotes(form.notes).map((note) => (
                <div key={note} className="flex items-start justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-700">{note}</p>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, notes: removeNote(p.notes, note) }))}
                    className="rounded bg-slate-200 px-2 py-1 text-[10px] text-slate-600"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
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
                setSelectedProjectEorOption('')
                setSentToSubcontractorInput('')
                setApproverInput('')
                setNoteInput('')
                setSelectedEorType('Civil EOR')
              }}
              className="rounded bg-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>
      ) : null}

      <div className="mt-6 grid gap-2 md:grid-cols-3">
        <input
          value={listSearch}
          onChange={(event) => setListSearch(event.target.value)}
          placeholder="Search submittal #, subject, or project id"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={listStatusFilter}
          onChange={(event) => setListStatusFilter(event.target.value as 'all' | 'opened' | 'closed')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="opened">Opened</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <div className="ui-scroll mt-3 overflow-x-auto">
        <table className="ui-table min-w-[1000px]">
          <thead><tr className="bg-slate-100">{['ID', 'Project', 'Submittal #', 'Overall Status', 'Due Date', 'Actions'].map((h) => <th key={h} className="border px-3 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {filteredTableSubmittals.map((item) => (
              <tr key={item.id}>
                <td className="border px-3 py-2">{item.id}</td>
                <td className="border px-3 py-2">{item.project_id ? (projectNameById[item.project_id] ?? 'Unknown Project') : ''}</td>
                <td className="border px-3 py-2">{item.submittal_number}</td>
                <td className="border px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={item.overall_status || item.approval_status || 'Opened'} tone={item.lifecycle_status === 'closed' ? 'success' : 'info'} />
                    {item.due_date && item.due_date < todayIsoDate() ? <StatusBadge label="Late" tone="danger" /> : null}
                  </div>
                </td>
                <td className="border px-3 py-2">{item.due_date ?? ''}</td>
                <td className="border px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowForm(true)
                        setEditingId(item.id)
                        setForm({ ...item })
                        setProjectSearch(item.project_id ? (projectNameById[item.project_id] ?? '') : '')
                        setSelectedProjectEorOption('')
                        setSentToSubcontractorInput(item.sent_to_subcontractor ?? '')
                        setApproverInput('')
                        setNoteInput('')
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
                        if (!res.ok) {
                          const detail = typeof res.data === 'object' && res.data && 'detail' in res.data
                            ? String((res.data as { detail?: unknown }).detail ?? '')
                            : ''
                          return setMessage(detail || 'Failed to delete submittal.')
                        }
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
            {filteredTableSubmittals.length === 0 ? (
              <tr>
                <td colSpan={6} className="border px-3 py-8">
                  <EmptyState
                    title="No submittals match"
                    description="Try a different search or status filter, or create a new submittal."
                    ctaLabel="Add Submittal"
                    onCta={() => setShowForm(true)}
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {showSubcontractorModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Add Subcontractor</h3>
            <label className="mt-3 block text-sm text-slate-700">
              Subcontractor Name
              <input
                type="text"
                value={newSubcontractorName}
                onChange={(e) => setNewSubcontractorName(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleCreateSubcontractor}
                className="rounded bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Save Subcontractor
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubcontractorModal(false)
                  setNewSubcontractorName('')
                }}
                className="rounded bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

