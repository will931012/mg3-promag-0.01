import { FormEvent, useEffect, useMemo, useState } from 'react'

import { EOR_TYPES } from '../../app/eorTypes'
import type { EorType } from '../../app/eorTypes'
import { toNullableString } from '../../app/formUtils'
import { createAor, createEor, createProject, deleteProject, fetchAors, fetchEors, updateProject } from '../../services/workspaceService'
import type { AorRecord, EorRecord, ProjectRecord, RfiRecord, SubmittalRecord } from '../../types/workspace'

type ProjectsPanelProps = {
  token: string
  projects: ProjectRecord[]
  submittals: SubmittalRecord[]
  rfis: RfiRecord[]
  setMessage: (message: string) => void
  refreshWorkspace: (token: string) => Promise<void>
}

type ProjectForm = Omit<ProjectRecord, 'project_id'>
const defaultEorType: EorType = 'Civil EOR'
const MULTI_VALUE_SEPARATOR = ' | '
const PROJECT_STATUS_OPTIONS = ['Preliminary', 'Under Construction', 'Substantial Completion'] as const
const PROJECT_PRIORITY_OPTIONS = ['High', 'Medium', 'Low'] as const
const NOTES_SEPARATOR = '\n\n'

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
  const notes = splitNotes(current)
  return [...notes, trimmed].join(NOTES_SEPARATOR)
}

function removeNote(current: string | null, noteToRemove: string): string {
  const notes = splitNotes(current).filter((item) => item !== noteToRemove)
  return notes.join(NOTES_SEPARATOR)
}

function isSubmittalClosed(item: SubmittalRecord): boolean {
  const statusText = String(item.overall_status || item.approval_status || '').toLowerCase()
  if (!statusText) return false
  if (statusText.includes('under revision') || statusText.includes('not approved')) return false
  return statusText.includes('approved') || statusText.includes('closed')
}

function isRfiClosed(item: RfiRecord): boolean {
  const statusText = String(item.status || '').toLowerCase()
  if (!statusText) return false
  if (statusText.includes('under revision') || statusText.includes('not approved') || statusText.includes('open')) return false
  return statusText.includes('approved') || statusText.includes('closed')
}

const emptyProjectForm: ProjectForm = {
  project_name: '',
  address: '',
  developer: '',
  aor: '',
  eor: '',
  end_date: '',
  status: '',
  priority: '',
  notes: '',
}
const BUILDING_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='720' height='420' viewBox='0 0 720 420'>" +
      "<defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>" +
      "<stop offset='0%' stop-color='#23395d'/><stop offset='100%' stop-color='#1a2438'/></linearGradient></defs>" +
      "<rect width='720' height='420' fill='url(#g)'/>" +
      "<rect x='120' y='90' width='480' height='260' rx='8' fill='#ced8e6'/>" +
      "<rect x='160' y='130' width='70' height='70' fill='#8ea2bf'/><rect x='250' y='130' width='70' height='70' fill='#8ea2bf'/>" +
      "<rect x='340' y='130' width='70' height='70' fill='#8ea2bf'/><rect x='430' y='130' width='70' height='70' fill='#8ea2bf'/>" +
      "<rect x='520' y='130' width='40' height='180' fill='#8ea2bf'/><rect x='160' y='220' width='250' height='90' fill='#8ea2bf'/>" +
      "<text x='360' y='60' text-anchor='middle' font-family='Arial' font-size='30' fill='#d7e2f4'>Project Building</text>" +
    "</svg>"
  )

export default function ProjectsPanel({ token, projects, submittals, rfis, setMessage, refreshWorkspace }: ProjectsPanelProps) {
  const [form, setForm] = useState<ProjectForm>(emptyProjectForm)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [detailsView, setDetailsView] = useState<'submittals' | 'rfis'>('submittals')
  const [submittalFilter, setSubmittalFilter] = useState<'opened' | 'closed'>('opened')
  const [rfiFilter, setRfiFilter] = useState<'opened' | 'closed'>('opened')
  const [selectedSubmittalDetailId, setSelectedSubmittalDetailId] = useState<number | null>(null)
  const [selectedRfiDetailId, setSelectedRfiDetailId] = useState<number | null>(null)
  const [aors, setAors] = useState<AorRecord[]>([])
  const [eors, setEors] = useState<EorRecord[]>([])
  const [aorInput, setAorInput] = useState('')
  const [eorInput, setEorInput] = useState('')
  const [showAorSuggestions, setShowAorSuggestions] = useState(false)
  const [showEorSuggestions, setShowEorSuggestions] = useState(false)
  const [selectedEorType, setSelectedEorType] = useState<EorType>(defaultEorType)
  const [showAorModal, setShowAorModal] = useState(false)
  const [showEorModal, setShowEorModal] = useState(false)
  const [newAorName, setNewAorName] = useState('')
  const [newEorName, setNewEorName] = useState('')
  const [newEorType, setNewEorType] = useState<EorType>(defaultEorType)
  const [noteInput, setNoteInput] = useState('')
  const [addCreatedAorToProject, setAddCreatedAorToProject] = useState(true)
  const [addCreatedEorToProject, setAddCreatedEorToProject] = useState(true)

  const loadAors = async () => {
    const next = await fetchAors(token)
    setAors(next)
  }

  const loadEors = async () => {
    const next = await fetchEors(token)
    setEors(next)
  }

  useEffect(() => {
    let mounted = true
    const loadInitialLists = async () => {
      const [nextAors, nextEors] = await Promise.all([fetchAors(token), fetchEors(token)])
      if (!mounted) return
      setAors(nextAors)
      setEors(nextEors)
    }
    loadInitialLists()
    return () => { mounted = false }
  }, [token])

  const sortedAors = useMemo(() => [...aors].sort((a, b) => a.name.localeCompare(b.name)), [aors])
  const filteredAors = useMemo(() => {
    const query = aorInput.trim().toLowerCase()
    if (query.length < 1) return []
    return sortedAors.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 8)
  }, [aorInput, sortedAors])

  const filteredEors = useMemo(() => {
    const byType = eors.filter((item) => item.type === selectedEorType)
    const query = eorInput.trim().toLowerCase()
    if (query.length < 1) return []
    return byType.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 8)
  }, [eorInput, eors, selectedEorType])
  const selectedProject = useMemo(
    () => projects.find((project) => project.project_id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  )
  const projectSubmittals = useMemo(
    () => submittals.filter((item) => item.project_id === selectedProjectId),
    [submittals, selectedProjectId]
  )
  const projectRfis = useMemo(
    () => rfis.filter((item) => item.project_id === selectedProjectId),
    [rfis, selectedProjectId]
  )
  const filteredProjectSubmittals = useMemo(
    () => projectSubmittals.filter((item) => (submittalFilter === 'closed' ? isSubmittalClosed(item) : !isSubmittalClosed(item))),
    [projectSubmittals, submittalFilter]
  )
  const filteredProjectRfis = useMemo(
    () => projectRfis.filter((item) => (rfiFilter === 'closed' ? isRfiClosed(item) : !isRfiClosed(item))),
    [projectRfis, rfiFilter]
  )
  const selectedSubmittalDetail = useMemo(
    () => projectSubmittals.find((item) => item.id === selectedSubmittalDetailId) ?? null,
    [projectSubmittals, selectedSubmittalDetailId]
  )
  const selectedRfiDetail = useMemo(
    () => projectRfis.find((item) => item.id === selectedRfiDetailId) ?? null,
    [projectRfis, selectedRfiDetailId]
  )

  const handleCreateAor = async () => {
    const name = newAorName.trim()
    if (!name) return setMessage('AOR name is required.')
    const res = await createAor(token, { name })
    if (!res.ok || !res.data) return setMessage('Failed to create AOR.')
    const createdAor = res.data
    await loadAors()
    if (addCreatedAorToProject) {
      setForm((prev) => ({ ...prev, aor: createdAor.name }))
      setAorInput(createdAor.name)
    }
    setNewAorName('')
    setAorInput('')
    setAddCreatedAorToProject(true)
    setShowAorModal(false)
    setMessage('AOR created.')
  }

  const handleCreateEor = async () => {
    const name = newEorName.trim()
    if (!name) return setMessage('EOR name is required.')
    const res = await createEor(token, { type: newEorType, name })
    if (!res.ok || !res.data) return setMessage('Failed to create EOR.')
    const createdEor = res.data
    await loadEors()
    setSelectedEorType(createdEor.type)
    if (addCreatedEorToProject) {
      setForm((prev) => ({ ...prev, eor: addUniqueMultiValue(prev.eor, `${createdEor.type}: ${createdEor.name}`) }))
    }
    setNewEorName('')
    setEorInput('')
    setNewEorType(defaultEorType)
    setAddCreatedEorToProject(true)
    setShowEorModal(false)
    setMessage('EOR created.')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (editingProjectId) {
      const updatePayload = {
        project_name: form.project_name,
        address: toNullableString(form.address),
        developer: toNullableString(form.developer),
        aor: toNullableString(form.aor),
        eor: toNullableString(form.eor),
        end_date: toNullableString(form.end_date),
        status: toNullableString(form.status),
        priority: toNullableString(form.priority),
        notes: toNullableString(form.notes),
      }
      const res = await updateProject(token, editingProjectId, updatePayload)
      if (!res.ok) return setMessage('Failed to update project.')
      setMessage('Project updated.')
      setEditingProjectId(null)
    } else {
      const res = await createProject(token, {
        project_name: form.project_name,
        address: toNullableString(form.address),
        developer: toNullableString(form.developer),
        aor: toNullableString(form.aor),
        eor: toNullableString(form.eor),
        end_date: toNullableString(form.end_date),
        status: toNullableString(form.status),
        priority: toNullableString(form.priority),
        notes: toNullableString(form.notes),
      })
      if (!res.ok) return setMessage('Failed to create project.')
      setMessage('Project created.')
    }

    setForm(emptyProjectForm)
    setSelectedEorType(defaultEorType)
    setAorInput('')
    setEorInput('')
    setNoteInput('')
    setShowForm(false)
    await refreshWorkspace(token)
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {selectedProject ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              {selectedSubmittalDetail ? 'Submittal Detail Page' : selectedRfiDetail ? 'RFI Detail Page' : 'Project Details'}
            </h2>
            <button
              type="button"
              onClick={() => {
                if (selectedSubmittalDetail) {
                  setSelectedSubmittalDetailId(null)
                  return
                }
                if (selectedRfiDetail) {
                  setSelectedRfiDetailId(null)
                  return
                }
                setSelectedProjectId(null)
              }}
              className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              {selectedSubmittalDetail || selectedRfiDetail ? 'Back to Project Details' : 'Back to Projects'}
            </button>
          </div>
          {selectedSubmittalDetail ? (
            <article className="detail-card mx-auto w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-md">
              <h3 className="text-2xl font-semibold text-slate-900">Submittal #{selectedSubmittalDetail.submittal_number || selectedSubmittalDetail.id}</h3>
              <p className="mt-1 text-sm text-slate-500">{selectedSubmittalDetail.subject || 'No subject'}</p>
              <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                <p><span className="font-semibold">Status:</span> {selectedSubmittalDetail.overall_status || selectedSubmittalDetail.approval_status || 'Opened'}</p>
                <p><span className="font-semibold">Due:</span> {selectedSubmittalDetail.due_date || 'N/A'}</p>
                <p><span className="font-semibold">Contractor:</span> {selectedSubmittalDetail.contractor || 'N/A'}</p>
                <p><span className="font-semibold">Responsible:</span> {selectedSubmittalDetail.responsible || 'N/A'}</p>
              </div>
              <p className="mt-4 text-sm text-slate-600">{selectedSubmittalDetail.notes || 'No notes.'}</p>
            </article>
          ) : selectedRfiDetail ? (
            <article className="detail-card mx-auto w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-md">
              <h3 className="text-2xl font-semibold text-slate-900">RFI #{selectedRfiDetail.rfi_number || selectedRfiDetail.id}</h3>
              <p className="mt-1 text-sm text-slate-500">{selectedRfiDetail.subject || 'No subject'}</p>
              <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                <p><span className="font-semibold">Status:</span> {selectedRfiDetail.status || 'Opened'}</p>
                <p><span className="font-semibold">Response Due:</span> {selectedRfiDetail.response_due || 'N/A'}</p>
                <p><span className="font-semibold">From:</span> {selectedRfiDetail.from_contractor || 'N/A'}</p>
                <p><span className="font-semibold">Responsible:</span> {selectedRfiDetail.responsible || 'N/A'}</p>
              </div>
              <p className="mt-4 text-sm text-slate-600">{selectedRfiDetail.description || selectedRfiDetail.notes || 'No notes.'}</p>
            </article>
          ) : (
            <>
              <article className="detail-card mx-auto w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
                <img src={BUILDING_PLACEHOLDER} alt="Project placeholder building" className="h-56 w-full object-cover" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-3xl font-semibold text-slate-900">{selectedProject.project_name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{selectedProject.address || 'No address'}</p>
                    </div>
                    <span className="text-2xl font-semibold text-brand-700">{selectedProject.priority || 'N/A'}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Developer: {selectedProject.developer || 'N/A'}</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailsView('submittals')}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                        detailsView === 'submittals' ? 'bg-brand-700 text-white' : 'border border-brand-700 text-brand-700'
                      }`}
                    >
                      Submittals
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailsView('rfis')}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                        detailsView === 'rfis' ? 'bg-brand-700 text-white' : 'border border-brand-700 text-brand-700'
                      }`}
                    >
                      RFIs
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {detailsView === 'submittals' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setSubmittalFilter('opened')}
                          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${submittalFilter === 'opened' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                        >
                          Submittals Opened
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubmittalFilter('closed')}
                          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${submittalFilter === 'closed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                        >
                          Submittals Closed
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setRfiFilter('opened')}
                          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${rfiFilter === 'opened' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                        >
                          RFIs Opened
                        </button>
                        <button
                          type="button"
                          onClick={() => setRfiFilter('closed')}
                          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${rfiFilter === 'closed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                        >
                          RFIs Closed
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>

              <div className="mt-6 overflow-x-auto pb-2">
                <div className="relative mx-auto flex min-w-max items-stretch gap-6 px-2">
                  <span className="absolute left-5 right-5 top-24 h-[2px] bg-gradient-to-r from-brand-700/30 via-brand-700 to-brand-700/30" />
                  <article className="detail-card relative z-10 w-[260px] rounded-xl border border-brand-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Project</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{selectedProject.project_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{selectedProject.project_id}</p>
                  </article>
                  {(detailsView === 'submittals' ? filteredProjectSubmittals : filteredProjectRfis).map((item, index) => (
                    <article key={`${detailsView}-${item.id}`} className="detail-card relative z-10 w-[260px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm" style={{ animationDelay: `${index * 70}ms` }}>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {detailsView === 'submittals' ? `Submittal #${item.id}` : `RFI #${item.id}`}
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {detailsView === 'submittals'
                          ? ((item as SubmittalRecord).submittal_number || (item as SubmittalRecord).subject || 'Untitled')
                          : ((item as RfiRecord).rfi_number || (item as RfiRecord).subject || 'Untitled')}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {detailsView === 'submittals'
                          ? ((item as SubmittalRecord).overall_status || (item as SubmittalRecord).approval_status || 'Opened')
                          : ((item as RfiRecord).status || 'Opened')}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (detailsView === 'submittals') {
                            setSelectedSubmittalDetailId((item as SubmittalRecord).id)
                          } else {
                            setSelectedRfiDetailId((item as RfiRecord).id)
                          }
                        }}
                        className="mt-3 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                      >
                        Open {detailsView === 'submittals' ? 'Submittal Detail Page' : 'RFI Detail Page'}
                      </button>
                    </article>
                  ))}
                  {(detailsView === 'submittals' ? filteredProjectSubmittals : filteredProjectRfis).length === 0 ? (
                    <article className="detail-card relative z-10 w-[300px] rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                      No {detailsView} found for the selected filter.
                    </article>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
      {!selectedProject ? (
      <>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">{editingProjectId ? 'Edit Project' : 'Projects'}</h2>
        <button
          type="button"
          onClick={() => {
            if (showForm && !editingProjectId) {
              setShowForm(false)
              return
            }
            setEditingProjectId(null)
            setForm(emptyProjectForm)
            setSelectedEorType(defaultEorType)
            setAorInput('')
            setEorInput('')
            setNoteInput('')
            setShowForm(true)
          }}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          {showForm ? 'Hide Form' : 'Add Project'}
        </button>
      </div>
      {showForm ? (
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[
          ['Project Name', 'project_name', 'text'],
          ['Address', 'address', 'text'],
          ['Developer', 'developer', 'text'],
          ['AOR', 'aor', 'text'],
          ['EOR', 'eor', 'text'],
          ['End Date', 'end_date', 'date'],
          ['Status', 'status', 'text'],
          ['Priority', 'priority', 'text'],
          ['Notes', 'notes', 'text'],
        ].map(([label, key, type]) => (
          <label key={key} className="text-sm text-slate-700">
            {label}
            {key === 'developer' ? (
              <select
                value={String(form[key as keyof ProjectForm] ?? '')}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Select developer</option>
                <option value="MG3">MG3</option>
                <option value="ABH">ABH</option>
                <option value="FORSE">FORSE</option>
              </select>
            ) : key === 'aor' ? (
              <>
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={aorInput}
                    onFocus={() => setShowAorSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowAorSuggestions(false), 120)}
                    onChange={(e) => {
                      setAorInput(e.target.value)
                      setForm((prev) => ({ ...prev, [key]: e.target.value }))
                      setShowAorSuggestions(true)
                    }}
                    placeholder="Search AOR"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                  {showAorSuggestions ? (
                    <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-md">
                      {aorInput.trim().length < 1 ? null : filteredAors.length > 0 ? (
                        filteredAors.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onMouseDown={() => {
                              setAorInput(item.name)
                              setForm((prev) => ({ ...prev, [key]: item.name }))
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
                  onClick={() => setShowAorModal(true)}
                  className="mt-2 rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  Add AOR to DB
                </button>
              </>
            ) : key === 'status' ? (
              <select
                value={String(form[key as keyof ProjectForm] ?? '')}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Select status</option>
                {PROJECT_STATUS_OPTIONS.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>{statusOption}</option>
                ))}
              </select>
            ) : key === 'priority' ? (
              <select
                value={String(form[key as keyof ProjectForm] ?? '')}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Select priority</option>
                {PROJECT_PRIORITY_OPTIONS.map((priorityOption) => (
                  <option key={priorityOption} value={priorityOption}>{priorityOption}</option>
                ))}
              </select>
            ) : key === 'notes' ? (
              <>
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Write note"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, notes: addNote(prev.notes, noteInput) }))
                    setNoteInput('')
                  }}
                  className="mt-2 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white"
                >
                  Add Note
                </button>
                {form.notes ? (
                  <div className="mt-2 space-y-2">
                    {splitNotes(form.notes).map((note) => (
                      <div key={note} className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-xs text-slate-700">{note}</p>
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, notes: removeNote(prev.notes, note) }))}
                          className="rounded bg-slate-200 px-2 py-1 text-[10px] text-slate-600"
                          aria-label="Remove note"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : key === 'eor' ? (
              <>
                <select
                  value={selectedEorType}
                  onChange={(e) => setSelectedEorType(e.target.value as EorType)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {EOR_TYPES.map((typeItem) => (
                    <option key={typeItem} value={typeItem}>{typeItem}</option>
                  ))}
                </select>
                <div className="relative mt-2">
                  <input
                    type="text"
                    value={eorInput}
                    onFocus={() => setShowEorSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowEorSuggestions(false), 120)}
                    onChange={(e) => {
                      setEorInput(e.target.value)
                      setShowEorSuggestions(true)
                    }}
                    placeholder={`Search ${selectedEorType}`}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                  {showEorSuggestions ? (
                    <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-md">
                      {eorInput.trim().length < 1 ? null : filteredEors.length > 0 ? (
                        filteredEors.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onMouseDown={() => {
                              setEorInput(item.name)
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
                    const formatted = `${selectedEorType}: ${eorInput.trim()}`
                    const next = addUniqueMultiValue(form.eor, formatted)
                    setForm((prev) => ({ ...prev, [key]: next }))
                    setEorInput('')
                    setShowEorSuggestions(false)
                  }}
                  className="mt-2 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white"
                >
                  Add EOR to Project
                </button>
                <button
                  type="button"
                  onClick={() => setShowEorModal(true)}
                  className="mt-2 rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  Add EOR to DB
                </button>
                {form.eor ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {splitMultiValues(form.eor).map((item) => (
                      <span key={item} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {item}
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, eor: removeMultiValue(prev.eor, item) }))}
                          className="rounded-full bg-slate-200 px-1 text-[10px] text-slate-600"
                          aria-label={`Remove ${item}`}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <input
                type={type}
                required={key === 'project_name'}
                value={String(form[key as keyof ProjectForm] ?? '')}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            )}
          </label>
        ))}
        <div className="flex gap-2 md:col-span-2 lg:col-span-3">
          <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
            {editingProjectId ? 'Update Project' : 'Create Project'}
          </button>
          {editingProjectId ? (
            <button
              type="button"
              onClick={() => {
                setEditingProjectId(null)
                setForm(emptyProjectForm)
                setSelectedEorType(defaultEorType)
                setAorInput('')
                setEorInput('')
                setNoteInput('')
              }}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              {['Project ID', 'Project Name', 'Developer', 'Status', 'Priority', 'Actions'].map((head) => (
                <th key={head} className="border px-3 py-2 text-left">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((item) => (
              <tr key={item.project_id}>
                <td className="border px-3 py-2">{item.project_id}</td>
                <td className="border px-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(item.project_id)
                      setDetailsView('submittals')
                      setSubmittalFilter('opened')
                      setRfiFilter('opened')
                      setSelectedSubmittalDetailId(null)
                      setSelectedRfiDetailId(null)
                    }}
                    className="font-semibold text-brand-700 underline-offset-2 hover:underline"
                  >
                    {item.project_name}
                  </button>
                </td>
                <td className="border px-3 py-2">{item.developer ?? ''}</td>
                <td className="border px-3 py-2">{item.status ?? ''}</td>
                <td className="border px-3 py-2">{item.priority ?? ''}</td>
                <td className="border px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowForm(true)
                        setEditingProjectId(item.project_id)
                        setForm({
                          project_name: item.project_name ?? '',
                          address: item.address ?? '',
                          developer: item.developer ?? '',
                          aor: item.aor ?? '',
                          eor: item.eor ?? '',
                          end_date: item.end_date ?? '',
                          status: item.status ?? '',
                          priority: item.priority ?? '',
                          notes: item.notes ?? '',
                        })
                        setSelectedEorType(defaultEorType)
                        setAorInput(item.aor ?? '')
                        setEorInput('')
                        setNoteInput('')
                      }}
                      className="rounded bg-slate-200 px-2 py-1 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete project ${item.project_id}?`)) return
                        const res = await deleteProject(token, item.project_id)
                        if (!res.ok) return setMessage('Failed to delete project.')
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

      {showAorModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Add AOR</h3>
            <label className="mt-3 block text-sm text-slate-700">
              AOR Name
              <input
                type="text"
                value={newAorName}
                onChange={(e) => setNewAorName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="mt-3 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={addCreatedAorToProject}
                onChange={(e) => setAddCreatedAorToProject(e.target.checked)}
                className="h-4 w-4"
              />
              Also add this AOR to current project
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleCreateAor}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Save AOR
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAorModal(false)
                  setNewAorName('')
                  setAddCreatedAorToProject(true)
                }}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEorModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Add EOR</h3>
            <label className="mt-3 block text-sm text-slate-700">
              EOR Type
              <select
                value={newEorType}
                onChange={(e) => setNewEorType(e.target.value as EorType)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {EOR_TYPES.map((typeItem) => (
                  <option key={typeItem} value={typeItem}>{typeItem}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm text-slate-700">
              EOR Name
              <input
                type="text"
                value={newEorName}
                onChange={(e) => setNewEorName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="mt-3 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={addCreatedEorToProject}
                onChange={(e) => setAddCreatedEorToProject(e.target.checked)}
                className="h-4 w-4"
              />
              Also add this EOR to current project
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleCreateEor}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Save EOR
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEorModal(false)
                  setNewEorName('')
                  setNewEorType(defaultEorType)
                  setAddCreatedEorToProject(true)
                }}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </>
      ) : null}
    </section>
  )
}
