import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { EOR_TYPES } from '../../app/eorTypes'
import type { EorType } from '../../app/eorTypes'
import { toNullableString } from '../../app/formUtils'
import { downloadCsv, downloadExcelHtml, sortRecords } from '../../app/tableUtils'
import { createSubcontractor, createRfi, deleteRfi, fetchSubcontractors, updateRfi } from '../../services/workspaceService'
import type { ProjectRecord, SubcontractorRecord, RfiRecord } from '../../types/workspace'
import EmptyState from '../common/EmptyState'
import PrimaryButton from '../common/PrimaryButton'
import SectionHeader from '../common/SectionHeader'
import StatusBadge from '../common/StatusBadge'

type RfisPanelProps = {
  token: string
  projects: ProjectRecord[]
  rfis: RfiRecord[]
  setMessage: (message: string) => void
  refreshWorkspace: (token: string) => Promise<void>
}

type RfiFormErrors = {
  project_id?: string
  sent_to_date?: string
  response_due?: string
  date_answered?: string
}

type TimingFilter = 'all' | 'late' | 'this_week'

const STATUS_OPTIONS = ['Approved', 'Under Revision', 'Not Approved'] as const
const MULTI_VALUE_SEPARATOR = ' | '
const NOTES_SEPARATOR = '\n\n'
const todayIsoDate = () => new Date().toISOString().slice(0, 10)
const getRfiLifecycleStatus = (status: string | null): 'opened' | 'closed' => {
  const text = String(status || '').toLowerCase()
  if (!text) return 'opened'
  return text.includes('approved') || text.includes('closed') || text.includes('complete') || text.includes('resolved') || text.includes('answered')
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

const emptyForm: Omit<RfiRecord, 'id'> = {
  project_id: '',
  rfi_number: '',
  subject: '',
  description: '',
  from_contractor: '',
  date_sent: '',
  sent_to_aor: '',
  sent_to_eor: '',
  sent_to_subcontractor: '',
  sent_to_date: '',
  response_due: '',
  date_answered: '',
  status: '',
  lifecycle_status: 'opened',
  days_open: null,
  responsible: '',
  notes: '',
}

export default function RfisPanel({ token, projects, rfis, setMessage, refreshWorkspace }: RfisPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [form, setForm] = useState<Omit<RfiRecord, 'id'>>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false)
  const [subcontractors, setSubcontractors] = useState<SubcontractorRecord[]>([])
  const [selectedProjectEorOption, setSelectedProjectEorOption] = useState('')
  const [sentToSubcontractorInput, setSentToSubcontractorInput] = useState('')
  const [showSubcontractorSuggestions, setShowSubcontractorSuggestions] = useState(false)
  const [selectedEorType, setSelectedEorType] = useState<EorType>('Civil EOR')
  const [showSubcontractorModal, setShowSubcontractorModal] = useState(false)
  const [newSubcontractorName, setNewSubcontractorName] = useState('')
  const [descriptionInput, setDescriptionInput] = useState('')
  const [listSearch, setListSearch] = useState('')
  const [listStatusFilter, setListStatusFilter] = useState<'all' | 'opened' | 'closed'>('all')
  const [listTimingFilter, setListTimingFilter] = useState<TimingFilter>('all')
  const [responsibleFilter, setResponsibleFilter] = useState('')
  const [sortColumn, setSortColumn] = useState<'id' | 'rfi_number' | 'status' | 'response_due'>('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.project_id, p.project_name])),
    [projects]
  )
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.project_name.localeCompare(b.project_name)),
    [projects]
  )
  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase()
    if (query.length < 1) return []
    return sortedProjects.filter((project) => project.project_name.toLowerCase().includes(query)).slice(0, 8)
  }, [projectSearch, sortedProjects])
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
  const filteredTableRfis = useMemo(() => {
    const query = listSearch.trim().toLowerCase()
    const responsibleQuery = responsibleFilter.trim().toLowerCase()
    return rfis.filter((item) => {
      const lifecycle = String(item.lifecycle_status || '').toLowerCase()
      const statusPass =
        listStatusFilter === 'all' ? true : listStatusFilter === 'opened' ? lifecycle !== 'closed' : lifecycle === 'closed'
      const searchPass = query.length === 0
        ? true
        : `${item.rfi_number || ''} ${item.subject || ''} ${item.project_id || ''}`.toLowerCase().includes(query)
      const responsiblePass = responsibleQuery.length === 0
        ? true
        : `${item.responsible || ''} ${item.from_contractor || ''}`.toLowerCase().includes(responsibleQuery)
      const timingPass =
        listTimingFilter === 'all'
          ? true
          : listTimingFilter === 'late'
            ? Boolean(item.response_due && item.response_due < todayIsoDate() && lifecycle !== 'closed')
            : Boolean(item.response_due && item.response_due >= todayIsoDate() && item.response_due <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
      return statusPass && searchPass && responsiblePass && timingPass
    })
  }, [rfis, listSearch, listStatusFilter, responsibleFilter, listTimingFilter])

  useEffect(() => {
    setListSearch(searchParams.get('search') ?? '')
    const status = searchParams.get('status')
    setListStatusFilter(status === 'opened' || status === 'closed' ? status : 'all')
    const timing = searchParams.get('timing')
    setListTimingFilter(timing === 'late' || timing === 'this_week' ? timing : 'all')
    setResponsibleFilter(searchParams.get('responsible') ?? '')
  }, [searchParams])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (listSearch.trim()) next.set('search', listSearch)
    else next.delete('search')
    if (listStatusFilter !== 'all') next.set('status', listStatusFilter)
    else next.delete('status')
    if (listTimingFilter !== 'all') next.set('timing', listTimingFilter)
    else next.delete('timing')
    if (responsibleFilter.trim()) next.set('responsible', responsibleFilter)
    else next.delete('responsible')
    setSearchParams(next, { replace: true })
  }, [listSearch, listStatusFilter, listTimingFilter, responsibleFilter, searchParams, setSearchParams])
  const formErrors = useMemo<RfiFormErrors>(() => {
    const errors: RfiFormErrors = {}
    if (!form.project_id?.trim()) errors.project_id = 'Project is required.'
    if (form.sent_to_date && !form.sent_to_aor && !form.sent_to_eor && !form.sent_to_subcontractor) {
      errors.sent_to_date = 'Sent to date requires at least one recipient.'
    }
    if (form.response_due && form.sent_to_date && form.response_due < form.sent_to_date) {
      errors.response_due = 'Response due cannot be earlier than sent to date.'
    }
    if (form.status === 'Approved' && !form.date_answered) {
      errors.date_answered = 'Approved RFIs require an answered date.'
    }
    return errors
  }, [form])

  const exportRfisCsv = () => {
    const headers = ['ID', 'Project ID', 'Project Name', 'RFI Number', 'Subject', 'Status', 'Response Due', 'Date Answered', 'Responsible']
    const rows = sortedRfis.map((item) => [
      item.id,
      item.project_id ?? '',
      item.project_id ? (projectNameById[item.project_id] ?? '') : '',
      item.rfi_number ?? '',
      item.subject ?? '',
      item.status ?? '',
      item.response_due ?? '',
      item.date_answered ?? '',
      item.responsible ?? '',
    ])
    downloadCsv('rfis-export.csv', headers, rows)
  }
  const exportRfisExcel = () => {
    const headers = ['ID', 'Project ID', 'Project Name', 'RFI Number', 'Subject', 'Status', 'Response Due', 'Date Answered', 'Responsible']
    const rows = sortedRfis.map((item) => [item.id, item.project_id ?? '', item.project_id ? (projectNameById[item.project_id] ?? '') : '', item.rfi_number ?? '', item.subject ?? '', item.status ?? '', item.response_due ?? '', item.date_answered ?? '', item.responsible ?? ''])
    downloadExcelHtml('rfis-export.xls', headers, rows)
  }
  const sortedRfis = useMemo(() => {
    const selector = (item: RfiRecord) => item[sortColumn]
    return sortRecords(filteredTableRfis, selector, sortDirection)
  }, [filteredTableRfis, sortColumn, sortDirection])
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(sortedRfis.length / pageSize))
  const pagedRfis = useMemo(() => sortedRfis.slice((page - 1) * pageSize, page * pageSize), [sortedRfis, page])
  const handleSort = (column: 'id' | 'rfi_number' | 'status' | 'response_due') => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortColumn(column)
    setSortDirection(column === 'id' ? 'desc' : 'asc')
  }

  useEffect(() => {
    setPage(1)
  }, [listSearch, listStatusFilter, listTimingFilter, responsibleFilter, sortColumn, sortDirection])

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
    if (Object.keys(formErrors).length > 0) {
      return setMessage('Review the highlighted RFI fields before saving.')
    }
    const payload = {
      project_id: toNullableString(form.project_id),
      rfi_number: toNullableString(form.rfi_number),
      subject: toNullableString(form.subject),
      description: toNullableString(form.description),
      from_contractor: toNullableString(form.from_contractor),
      date_sent: toNullableString(form.date_sent),
      sent_to_aor: toNullableString(form.sent_to_aor),
      sent_to_eor: toNullableString(form.sent_to_eor),
      sent_to_subcontractor: toNullableString(form.sent_to_subcontractor),
      sent_to_date: toNullableString(form.sent_to_date),
      response_due: toNullableString(form.response_due),
      date_answered: toNullableString(form.date_answered),
      status: toNullableString(form.status),
      lifecycle_status: getRfiLifecycleStatus(form.status),
      days_open: null,
      responsible: toNullableString(form.responsible),
      notes: toNullableString(form.notes),
    }
    const res = editingId ? await updateRfi(token, editingId, payload) : await createRfi(token, payload)
    if (!res.ok) return setMessage('Failed to save RFI.')
    setMessage(editingId ? 'RFI updated.' : 'RFI created.')
    setEditingId(null)
    setForm(emptyForm)
    setProjectSearch('')
    setSelectedProjectEorOption('')
    setSentToSubcontractorInput('')
    setDescriptionInput('')
    setSelectedEorType('Civil EOR')
    setShowForm(false)
    await refreshWorkspace(token)
  }

  return (
    <section className="ui-panel slide-in">
      <SectionHeader
        title={editingId ? 'Edit RFI' : 'RFIs'}
        subtitle="Keep request communication visible with clear open/closed status."
        actions={
          <div className="flex flex-wrap gap-2">
            <PrimaryButton
              type="button"
              variant="secondary"
              onClick={exportRfisCsv}
            >
              Export CSV
            </PrimaryButton>
            <PrimaryButton
              type="button"
              variant="secondary"
              onClick={exportRfisExcel}
            >
              Export Excel
            </PrimaryButton>
            <PrimaryButton
              type="button"
              onClick={() => {
                if (showForm) {
                  setEditingId(null)
                  setShowForm(false)
                  return
                }
                setEditingId(null)
                setForm(emptyForm)
                setProjectSearch('')
                setSelectedProjectEorOption('')
                setSentToSubcontractorInput('')
                setDescriptionInput('')
                setSelectedEorType('Civil EOR')
                setShowForm(true)
              }}
            >
              {showForm ? 'Hide Form' : 'Add RFI'}
            </PrimaryButton>
          </div>
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
          {formErrors.project_id ? <p className="mt-1 text-xs text-rose-600">{formErrors.project_id}</p> : null}
        </label>
        <label className="text-sm">RFI #
          <input value={form.rfi_number ?? ''} onChange={(e) => setForm((p) => ({ ...p, rfi_number: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Subject
          <input value={form.subject ?? ''} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Status
          <select
            value={form.status ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            className="mt-1 w-full rounded border px-2 py-2"
          >
            <option value="">Select status</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <div className="text-sm lg:col-span-2">
          <label className="text-sm">Description</label>
          <textarea
            value={descriptionInput}
            onChange={(e) => setDescriptionInput(e.target.value)}
            rows={3}
            placeholder="Write description note"
            className="mt-1 w-full rounded border px-2 py-2"
          />
          <button
            type="button"
            onClick={() => {
              setForm((p) => ({ ...p, description: addNote(p.description, descriptionInput) }))
              setDescriptionInput('')
            }}
            className="mt-2 rounded bg-brand-700 px-3 py-2 text-xs font-semibold text-white"
          >
            Add Description
          </button>
          {form.description ? (
            <div className="mt-2 space-y-2">
              {splitNotes(form.description).map((note) => (
                <div key={note} className="flex items-start justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-700">{note}</p>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, description: removeNote(p.description, note) }))}
                    className="rounded bg-slate-200 px-2 py-1 text-[10px] text-slate-600"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
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
                  setForm((p) => ({ ...p, sent_to_subcontractor: e.target.value }))
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
                  setForm((p) => ({ ...p, sent_to_subcontractor: trimmed }))
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
                    onClick={() => setForm((p) => ({ ...p, sent_to_subcontractor: '' }))}
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
          {formErrors.sent_to_date ? <p className="mt-1 text-xs text-rose-600">{formErrors.sent_to_date}</p> : null}
        </label>
        <label className="text-sm">Response Due
          <input type="date" value={form.response_due ?? ''} onChange={(e) => setForm((p) => ({ ...p, response_due: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
          {formErrors.response_due ? <p className="mt-1 text-xs text-rose-600">{formErrors.response_due}</p> : null}
        </label>
        <label className="text-sm">Date Answered
          <input type="date" value={form.date_answered ?? ''} onChange={(e) => setForm((p) => ({ ...p, date_answered: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
          {formErrors.date_answered ? <p className="mt-1 text-xs text-rose-600">{formErrors.date_answered}</p> : null}
        </label>
        <div className={`lg:col-span-4 ${editingId ? 'sticky bottom-3 z-10 rounded-xl border border-sky-200 bg-sky-50/95 p-3 shadow-lg backdrop-blur' : ''}`}>
          {editingId ? (
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">Editing mode</p>
                <p className="text-sm font-medium text-slate-800">RFI #{editingId}. Guarda tus cambios antes de salir.</p>
              </div>
            </div>
          ) : null}
          <div className="flex gap-2">
            <button
              type="submit"
              className={`rounded px-4 py-2 text-sm font-semibold text-white ${editingId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-brand-700'}`}
            >
              {editingId ? 'Save Changes' : 'Create RFI'}
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
                  setDescriptionInput('')
                  setSelectedEorType('Civil EOR')
                }}
                className="rounded bg-slate-200 px-4 py-2 text-sm font-semibold"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </div>
      </form>
      ) : null}

      <div className="mt-6 grid gap-2 md:grid-cols-4">
        <input
          value={listSearch}
          onChange={(event) => setListSearch(event.target.value)}
          placeholder="Search RFI #, subject, or project id"
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
        <select
          value={listTimingFilter}
          onChange={(event) => setListTimingFilter(event.target.value as TimingFilter)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All timing</option>
          <option value="late">Overdue only</option>
          <option value="this_week">Due this week</option>
        </select>
        <input
          value={responsibleFilter}
          onChange={(event) => setResponsibleFilter(event.target.value)}
          placeholder="Filter by responsible or contractor"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="ui-scroll mt-3 overflow-x-auto">
        <table className="ui-table min-w-[900px]">
          <thead><tr className="bg-slate-100">
            <th className="border px-3 py-2 text-left"><button type="button" onClick={() => handleSort('id')} className="font-semibold">ID</button></th>
            <th className="border px-3 py-2 text-left">Project</th>
            <th className="border px-3 py-2 text-left"><button type="button" onClick={() => handleSort('rfi_number')} className="font-semibold">RFI #</button></th>
            <th className="border px-3 py-2 text-left">Subject</th>
            <th className="border px-3 py-2 text-left"><button type="button" onClick={() => handleSort('status')} className="font-semibold">Status</button></th>
            <th className="border px-3 py-2 text-left">Actions</th>
          </tr></thead>
          <tbody>
            {pagedRfis.map((item) => (
              <tr key={item.id}>
                <td className="border px-3 py-2">{item.id}</td>
                <td className="border px-3 py-2">{item.project_id ? (projectNameById[item.project_id] ?? 'Unknown Project') : ''}</td>
                <td className="border px-3 py-2">{item.rfi_number}</td>
                <td className="border px-3 py-2">{item.subject}</td>
                <td className="border px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={item.status || 'Opened'} tone={item.lifecycle_status === 'closed' ? 'success' : 'info'} />
                    {item.response_due && item.response_due < todayIsoDate() ? <StatusBadge label="Overdue" tone="danger" /> : null}
                  </div>
                </td>
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
                        setDescriptionInput('')
                        setSelectedEorType('Civil EOR')
                      }}
                      className="rounded bg-slate-200 px-2 py-1 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete RFI ${item.id}?`)) return
                        const res = await deleteRfi(token, item.id)
                        if (!res.ok) return setMessage('Failed to delete RFI.')
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
            {sortedRfis.length === 0 ? (
              <tr>
                <td colSpan={6} className="border px-3 py-8">
                  <EmptyState
                    title="No RFIs match"
                    description="Try changing filters or add a new RFI."
                    ctaLabel="Add RFI"
                    onCta={() => setShowForm(true)}
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="rounded border px-3 py-1 disabled:opacity-50">Previous</button>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} className="rounded border px-3 py-1 disabled:opacity-50">Next</button>
        </div>
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

