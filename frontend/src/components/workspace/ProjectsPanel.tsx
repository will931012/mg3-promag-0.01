import { FormEvent, useEffect, useMemo, useState } from 'react'

import { EOR_TYPES } from '../../app/eorTypes'
import type { EorType } from '../../app/eorTypes'
import { toNullableString } from '../../app/formUtils'
import Breadcrumbs from '../common/Breadcrumbs'
import EmptyState from '../common/EmptyState'
import PrimaryButton from '../common/PrimaryButton'
import SectionHeader from '../common/SectionHeader'
import StatusBadge from '../common/StatusBadge'
import {
  createAor,
  createEor,
  createProject,
  deleteProject,
  fetchAors,
  fetchEors,
  updateProject,
  updateRfi,
  updateSubmittal,
} from '../../services/workspaceService'
import type { AorRecord, EorRecord, ProjectRecord, RfiRecord, SubmittalRecord } from '../../types/workspace'

type ProjectsPanelProps = {
  token: string
  projects: ProjectRecord[]
  submittals: SubmittalRecord[]
  rfis: RfiRecord[]
  routeProjectId: string | null
  routeSubmittalId: number | null
  routeRfiId: number | null
  onNavigate: (path: string) => void
  setMessage: (message: string) => void
  refreshWorkspace: (token: string) => Promise<void>
}

type ProjectForm = Omit<ProjectRecord, 'project_id'>
const defaultEorType: EorType = 'Civil EOR'
const MULTI_VALUE_SEPARATOR = ' | '
const PROJECT_STATUS_OPTIONS = ['Preliminary', 'Under Construction', 'Substantial Completion'] as const
const PROJECT_PRIORITY_OPTIONS = ['High', 'Medium', 'Low'] as const
const SUBMITTAL_STATUS_OPTIONS = ['Approved', 'Under Revision', 'Not Approved'] as const
const RFI_STATUS_OPTIONS = ['Approved', 'Under Revision', 'Not Approved'] as const
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
  const lifecycleStatus = String(item.lifecycle_status || '').toLowerCase()
  if (lifecycleStatus === 'closed') return true
  if (lifecycleStatus === 'opened') return false
  const statusText = String(item.overall_status || item.approval_status || '').toLowerCase()
  if (!statusText) return false
  if (statusText.includes('under revision') || statusText.includes('not approved')) return false
  return statusText.includes('approved') || statusText.includes('closed')
}

function isRfiClosed(item: RfiRecord): boolean {
  const lifecycleStatus = String(item.lifecycle_status || '').toLowerCase()
  if (lifecycleStatus === 'closed') return true
  if (lifecycleStatus === 'opened') return false
  const statusText = String(item.status || '').toLowerCase()
  if (!statusText) return false
  if (statusText.includes('under revision') || statusText.includes('not approved') || statusText.includes('open')) return false
  return statusText.includes('approved') || statusText.includes('closed')
}

function getSubmittalLifecycleStatus(status: string | null): 'opened' | 'closed' {
  const text = String(status || '').toLowerCase()
  if (!text) return 'opened'
  return text.includes('approved') || text.includes('closed') || text.includes('complete') || text.includes('resolved')
    ? 'closed'
    : 'opened'
}

function getRfiLifecycleStatus(status: string | null): 'opened' | 'closed' {
  const text = String(status || '').toLowerCase()
  if (!text) return 'opened'
  return text.includes('approved') || text.includes('closed') || text.includes('complete') || text.includes('resolved') || text.includes('answered')
    ? 'closed'
    : 'opened'
}

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

function isDueWithinSevenDays(dateValue: string | null): boolean {
  if (!dateValue) return false
  const now = new Date(todayIsoDate())
  const due = new Date(dateValue)
  const diffMs = due.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= 7
}

function isPastDue(dateValue: string | null): boolean {
  if (!dateValue) return false
  return dateValue < todayIsoDate()
}

const emptyProjectForm: ProjectForm = {
  project_name: '',
  address: '',
  image_url: '',
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

export default function ProjectsPanel({
  token,
  projects,
  submittals,
  rfis,
  routeProjectId,
  routeSubmittalId,
  routeRfiId,
  onNavigate,
  setMessage,
  refreshWorkspace
}: ProjectsPanelProps) {
  const [form, setForm] = useState<ProjectForm>(emptyProjectForm)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(routeProjectId)
  const [detailsView, setDetailsView] = useState<'submittals' | 'rfis'>('submittals')
  const [submittalFilter, setSubmittalFilter] = useState<'opened' | 'closed'>('opened')
  const [rfiFilter, setRfiFilter] = useState<'opened' | 'closed'>('opened')
  const [selectedSubmittalDetailId, setSelectedSubmittalDetailId] = useState<number | null>(routeSubmittalId)
  const [selectedRfiDetailId, setSelectedRfiDetailId] = useState<number | null>(routeRfiId)
  const [submittalDraft, setSubmittalDraft] = useState<Omit<SubmittalRecord, 'id'> | null>(null)
  const [rfiDraft, setRfiDraft] = useState<Omit<RfiRecord, 'id'> | null>(null)
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
  const [detailSearch, setDetailSearch] = useState('')
  const [detailTimingFilter, setDetailTimingFilter] = useState<'all' | 'late' | 'this_week'>('all')
  const [isSavingSubmittalDetail, setIsSavingSubmittalDetail] = useState(false)
  const [isSavingRfiDetail, setIsSavingRfiDetail] = useState(false)

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
  const detailItems = useMemo<Array<SubmittalRecord | RfiRecord>>(
    () => (detailsView === 'submittals' ? filteredProjectSubmittals : filteredProjectRfis),
    [detailsView, filteredProjectSubmittals, filteredProjectRfis]
  )
  const searchedDetailItems = useMemo(() => {
    const query = detailSearch.trim().toLowerCase()
    const bySearch = query
      ? detailItems.filter((item) => {
          if (detailsView === 'submittals') {
            const source = item as SubmittalRecord
            return `${source.submittal_number || ''} ${source.subject || ''}`.toLowerCase().includes(query)
          }
          const source = item as RfiRecord
          return `${source.rfi_number || ''} ${source.subject || ''}`.toLowerCase().includes(query)
        })
      : detailItems
    if (detailTimingFilter === 'all') return bySearch
    return bySearch.filter((item) => {
      const targetDate = detailsView === 'submittals' ? (item as SubmittalRecord).due_date : (item as RfiRecord).response_due
      return detailTimingFilter === 'late' ? isPastDue(targetDate) : isDueWithinSevenDays(targetDate)
    })
  }, [detailItems, detailSearch, detailTimingFilter, detailsView])
  const firstDetailRow = useMemo(() => searchedDetailItems.slice(0, 2), [searchedDetailItems])
  const extraDetailRows = useMemo(() => {
    const rows: Array<Array<SubmittalRecord | RfiRecord>> = []
    for (let index = 2; index < searchedDetailItems.length; index += 2) {
      rows.push(searchedDetailItems.slice(index, index + 2))
    }
    return rows
  }, [searchedDetailItems])
  const submittalDetailOrder = useMemo(() => projectSubmittals.map((item) => item.id), [projectSubmittals])
  const rfiDetailOrder = useMemo(() => projectRfis.map((item) => item.id), [projectRfis])

  useEffect(() => {
    setSelectedProjectId(routeProjectId)
    setSelectedSubmittalDetailId(routeSubmittalId)
    setSelectedRfiDetailId(routeRfiId)
    if (routeRfiId) setDetailsView('rfis')
    if (routeSubmittalId) setDetailsView('submittals')
  }, [routeProjectId, routeSubmittalId, routeRfiId])

  const hasUnsavedSubmittalDetail = useMemo(() => {
    if (!selectedSubmittalDetail || !submittalDraft) return false
    return JSON.stringify(submittalDraft) !== JSON.stringify(selectedSubmittalDetail)
  }, [selectedSubmittalDetail, submittalDraft])

  const hasUnsavedRfiDetail = useMemo(() => {
    if (!selectedRfiDetail || !rfiDraft) return false
    return JSON.stringify(rfiDraft) !== JSON.stringify(selectedRfiDetail)
  }, [selectedRfiDetail, rfiDraft])

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedSubmittalDetail && !hasUnsavedRfiDetail) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [hasUnsavedSubmittalDetail, hasUnsavedRfiDetail])

  const handleSaveSubmittalDetail = async () => {
    if (!selectedSubmittalDetailId || !submittalDraft) return
    setIsSavingSubmittalDetail(true)
    const payload: Omit<SubmittalRecord, 'id'> = {
      ...submittalDraft,
      project_id: toNullableString(submittalDraft.project_id),
      division_csi: toNullableString(submittalDraft.division_csi),
      submittal_number: toNullableString(submittalDraft.submittal_number),
      subject: toNullableString(submittalDraft.subject),
      contractor: toNullableString(submittalDraft.contractor),
      date_received: toNullableString(submittalDraft.date_received),
      sent_to_aor: toNullableString(submittalDraft.sent_to_aor),
      sent_to_eor: toNullableString(submittalDraft.sent_to_eor),
      sent_to_subcontractor: toNullableString(submittalDraft.sent_to_subcontractor),
      sent_to_date: toNullableString(submittalDraft.sent_to_date),
      approvers: toNullableString(submittalDraft.approvers),
      approval_status: toNullableString(submittalDraft.approval_status),
      lifecycle_status: getSubmittalLifecycleStatus(submittalDraft.overall_status ?? submittalDraft.approval_status),
      revision: toNullableString(submittalDraft.revision),
      due_date: toNullableString(submittalDraft.due_date),
      overall_status: toNullableString(submittalDraft.overall_status),
      responsible: toNullableString(submittalDraft.responsible),
      workflow_stage: toNullableString(submittalDraft.workflow_stage),
      notes: toNullableString(submittalDraft.notes),
      days_pending: null,
    }
    const res = await updateSubmittal(token, selectedSubmittalDetailId, payload)
    if (!res.ok) {
      setIsSavingSubmittalDetail(false)
      return setMessage('Failed to update submittal from detail page.')
    }
    setMessage('Submittal updated.')
    await refreshWorkspace(token)
    setIsSavingSubmittalDetail(false)
  }

  const handleSaveRfiDetail = async () => {
    if (!selectedRfiDetailId || !rfiDraft) return
    setIsSavingRfiDetail(true)
    const payload: Omit<RfiRecord, 'id'> = {
      ...rfiDraft,
      project_id: toNullableString(rfiDraft.project_id),
      rfi_number: toNullableString(rfiDraft.rfi_number),
      subject: toNullableString(rfiDraft.subject),
      description: toNullableString(rfiDraft.description),
      from_contractor: toNullableString(rfiDraft.from_contractor),
      date_sent: toNullableString(rfiDraft.date_sent),
      sent_to_aor: toNullableString(rfiDraft.sent_to_aor),
      sent_to_eor: toNullableString(rfiDraft.sent_to_eor),
      sent_to_subcontractor: toNullableString(rfiDraft.sent_to_subcontractor),
      sent_to_date: toNullableString(rfiDraft.sent_to_date),
      response_due: toNullableString(rfiDraft.response_due),
      date_answered: toNullableString(rfiDraft.date_answered),
      status: toNullableString(rfiDraft.status),
      lifecycle_status: getRfiLifecycleStatus(rfiDraft.status),
      responsible: toNullableString(rfiDraft.responsible),
      notes: toNullableString(rfiDraft.notes),
      days_open: null,
    }
    const res = await updateRfi(token, selectedRfiDetailId, payload)
    if (!res.ok) {
      setIsSavingRfiDetail(false)
      return setMessage('Failed to update RFI from detail page.')
    }
    setMessage('RFI updated.')
    await refreshWorkspace(token)
    setIsSavingRfiDetail(false)
  }

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
        image_url: toNullableString(form.image_url),
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
        image_url: toNullableString(form.image_url),
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
    <section className="ui-panel slide-in">
      {selectedProject ? (
        <div>
          <Breadcrumbs
            items={[
              { label: 'Projects', onClick: () => onNavigate('/projects') },
              { label: selectedProject.project_name, onClick: selectedSubmittalDetail || selectedRfiDetail ? () => onNavigate(`/projects/${encodeURIComponent(selectedProject.project_id)}`) : undefined },
              ...(selectedSubmittalDetail ? [{ label: `Submittal #${selectedSubmittalDetail.id}` }] : []),
              ...(selectedRfiDetail ? [{ label: `RFI #${selectedRfiDetail.id}` }] : []),
            ]}
            rightSlot={
              <PrimaryButton
                type="button"
                variant="secondary"
                onClick={() => {
                  if (selectedSubmittalDetail) {
                    if (hasUnsavedSubmittalDetail && !confirm('You have unsaved Submittal changes. Leave anyway?')) return
                    onNavigate(`/projects/${encodeURIComponent(selectedProject.project_id)}`)
                    setSubmittalDraft(null)
                    return
                  }
                  if (selectedRfiDetail) {
                    if (hasUnsavedRfiDetail && !confirm('You have unsaved RFI changes. Leave anyway?')) return
                    onNavigate(`/projects/${encodeURIComponent(selectedProject.project_id)}`)
                    setRfiDraft(null)
                    return
                  }
                  onNavigate('/projects')
                  setSubmittalDraft(null)
                  setRfiDraft(null)
                }}
              >
                {selectedSubmittalDetail || selectedRfiDetail ? 'Back to Project Details' : 'Back to Projects'}
              </PrimaryButton>
            }
          />
          <SectionHeader
            title={selectedSubmittalDetail ? 'Submittal Detail Page' : selectedRfiDetail ? 'RFI Detail Page' : 'Project Details'}
            subtitle={selectedSubmittalDetail || selectedRfiDetail ? 'Edit and save changes with clear navigation controls.' : 'Switch between Submittals and RFIs for this project.'}
          />
          {selectedSubmittalDetail ? (
            <article className="detail-card mx-auto w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-5 shadow-md">
              <h3 className="text-2xl font-semibold text-slate-900">Submittal Detail Page</h3>
              <p className="mt-1 text-sm text-slate-600">Edit and save this submittal from here.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm text-slate-700">Project ID
                  <input
                    value={submittalDraft?.project_id ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, project_id: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Division CSI
                  <input
                    value={submittalDraft?.division_csi ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, division_csi: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Submittal #
                  <input
                    value={submittalDraft?.submittal_number ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, submittal_number: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Date Received
                  <input
                    type="date"
                    value={submittalDraft?.date_received ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, date_received: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Due Date
                  <input
                    type="date"
                    value={submittalDraft?.due_date ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, due_date: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Subject
                  <input
                    value={submittalDraft?.subject ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, subject: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Contractor
                  <input
                    value={submittalDraft?.contractor ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, contractor: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Sent To AOR
                  <input
                    value={submittalDraft?.sent_to_aor ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, sent_to_aor: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Sent To EOR
                  <input
                    value={submittalDraft?.sent_to_eor ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, sent_to_eor: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Sent To Subcontractor
                  <input
                    value={submittalDraft?.sent_to_subcontractor ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, sent_to_subcontractor: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Sent To Date
                  <input
                    type="date"
                    value={submittalDraft?.sent_to_date ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, sent_to_date: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Approvers
                  <input
                    value={submittalDraft?.approvers ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, approvers: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Approval Status
                  <select
                    value={submittalDraft?.approval_status ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, approval_status: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  >
                    <option value="">Select status</option>
                    {SUBMITTAL_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-700">Revision
                  <input
                    value={submittalDraft?.revision ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, revision: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Overall Status
                  <select
                    value={submittalDraft?.overall_status ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, overall_status: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  >
                    <option value="">Select status</option>
                    {SUBMITTAL_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-700">Responsible
                  <input
                    value={submittalDraft?.responsible ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, responsible: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Workflow Stage
                  <input
                    value={submittalDraft?.workflow_stage ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, workflow_stage: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700 lg:col-span-3">Notes
                  <textarea
                    value={submittalDraft?.notes ?? ''}
                    onChange={(e) => setSubmittalDraft((prev) => (prev ? { ...prev, notes: e.target.value } : prev))}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 md:sticky md:bottom-0 md:bg-white">
                <StatusBadge label={hasUnsavedSubmittalDetail ? 'Unsaved Changes' : 'All Changes Saved'} tone={hasUnsavedSubmittalDetail ? 'warning' : 'success'} />
                <PrimaryButton type="button" onClick={handleSaveSubmittalDetail} disabled={isSavingSubmittalDetail}>
                  {isSavingSubmittalDetail ? 'Saving...' : 'Save Changes'}
                </PrimaryButton>
                <PrimaryButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!selectedSubmittalDetail) return
                    setSubmittalDraft({ ...selectedSubmittalDetail })
                  }}
                >
                  Reset
                </PrimaryButton>
                <PrimaryButton
                  type="button"
                  variant="secondary"
                  disabled={submittalDetailOrder.indexOf(selectedSubmittalDetailId || 0) <= 0}
                  onClick={() => {
                    if (hasUnsavedSubmittalDetail && !confirm('You have unsaved Submittal changes. Continue without saving?')) return
                    const currentIndex = submittalDetailOrder.indexOf(selectedSubmittalDetailId || 0)
                    if (currentIndex <= 0) return
                    const prevId = submittalDetailOrder[currentIndex - 1]
                    onNavigate(`/projects/${encodeURIComponent(selectedProject.project_id)}/submittals/${prevId}`)
                  }}
                >
                  Previous
                </PrimaryButton>
                <PrimaryButton
                  type="button"
                  variant="secondary"
                  disabled={submittalDetailOrder.indexOf(selectedSubmittalDetailId || 0) >= submittalDetailOrder.length - 1}
                  onClick={() => {
                    if (hasUnsavedSubmittalDetail && !confirm('You have unsaved Submittal changes. Continue without saving?')) return
                    const currentIndex = submittalDetailOrder.indexOf(selectedSubmittalDetailId || 0)
                    if (currentIndex < 0 || currentIndex >= submittalDetailOrder.length - 1) return
                    const nextId = submittalDetailOrder[currentIndex + 1]
                    onNavigate(`/projects/${encodeURIComponent(selectedProject.project_id)}/submittals/${nextId}`)
                  }}
                >
                  Next
                </PrimaryButton>
              </div>
            </article>
          ) : selectedRfiDetail ? (
            <article className="detail-card mx-auto w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-5 shadow-md">
              <h3 className="text-2xl font-semibold text-slate-900">RFI Detail Page</h3>
              <p className="mt-1 text-sm text-slate-600">Edit and save this RFI from here.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm text-slate-700">Project ID
                  <input
                    value={rfiDraft?.project_id ?? ''}
                    onChange={(e) => setRfiDraft((prev) => (prev ? { ...prev, project_id: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">RFI #
                  <input
                    value={rfiDraft?.rfi_number ?? ''}
                    onChange={(e) => setRfiDraft((prev) => (prev ? { ...prev, rfi_number: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Status
                  <select
                    value={rfiDraft?.status ?? ''}
                    onChange={(e) => setRfiDraft((prev) => (prev ? { ...prev, status: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  >
                    <option value="">Select status</option>
                    {RFI_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-700">Subject
                  <input
                    value={rfiDraft?.subject ?? ''}
                    onChange={(e) => setRfiDraft((prev) => (prev ? { ...prev, subject: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Date Sent
                  <input
                    type="date"
                    value={rfiDraft?.date_sent ?? ''}
                    onChange={(e) => setRfiDraft((prev) => (prev ? { ...prev, date_sent: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Response Due
                  <input
                    type="date"
                    value={rfiDraft?.response_due ?? ''}
                    onChange={(e) => setRfiDraft((prev) => (prev ? { ...prev, response_due: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Date Answered
                  <input
                    type="date"
                    value={rfiDraft?.date_answered ?? ''}
                    onChange={(e) => setRfiDraft((prev) => (prev ? { ...prev, date_answered: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">From Contractor
                  <input
                    value={rfiDraft?.from_contractor ?? ''}
                    onChange={(e) => setRfiDraft((prev) => (prev ? { ...prev, from_contractor: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Sent To AOR
                  <input
                    value={rfiDraft?.sent_to_aor ?? ''}
                    onChange={(e) => setRfiDraft((prev) => (prev ? { ...prev, sent_to_aor: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Sent To EOR
                  <input
                    value={rfiDraft?.sent_to_eor ?? ''}
                    onChange={(e) => setRfiDraft((prev) => (prev ? { ...prev, sent_to_eor: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Sent To Subcontractor
                  <input
                    value={rfiDraft?.sent_to_subcontractor ?? ''}
                    onChange={(e) => setRfiDraft((prev) => (prev ? { ...prev, sent_to_subcontractor: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Sent To Date
                  <input
                    type="date"
                    value={rfiDraft?.sent_to_date ?? ''}
                    onChange={(e) => setRfiDraft((prev) => (prev ? { ...prev, sent_to_date: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700">Responsible
                  <input
                    value={rfiDraft?.responsible ?? ''}
                    onChange={(e) => setRfiDraft((prev) => (prev ? { ...prev, responsible: e.target.value } : prev))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700 lg:col-span-3">Description
                  <textarea
                    value={rfiDraft?.description ?? ''}
                    onChange={(e) => setRfiDraft((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-700 lg:col-span-3">Notes
                  <textarea
                    value={rfiDraft?.notes ?? ''}
                    onChange={(e) => setRfiDraft((prev) => (prev ? { ...prev, notes: e.target.value } : prev))}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 md:sticky md:bottom-0 md:bg-white">
                <StatusBadge label={hasUnsavedRfiDetail ? 'Unsaved Changes' : 'All Changes Saved'} tone={hasUnsavedRfiDetail ? 'warning' : 'success'} />
                <PrimaryButton type="button" onClick={handleSaveRfiDetail} disabled={isSavingRfiDetail}>
                  {isSavingRfiDetail ? 'Saving...' : 'Save Changes'}
                </PrimaryButton>
                <PrimaryButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!selectedRfiDetail) return
                    setRfiDraft({ ...selectedRfiDetail })
                  }}
                >
                  Reset
                </PrimaryButton>
                <PrimaryButton
                  type="button"
                  variant="secondary"
                  disabled={rfiDetailOrder.indexOf(selectedRfiDetailId || 0) <= 0}
                  onClick={() => {
                    if (hasUnsavedRfiDetail && !confirm('You have unsaved RFI changes. Continue without saving?')) return
                    const currentIndex = rfiDetailOrder.indexOf(selectedRfiDetailId || 0)
                    if (currentIndex <= 0) return
                    const prevId = rfiDetailOrder[currentIndex - 1]
                    onNavigate(`/projects/${encodeURIComponent(selectedProject.project_id)}/rfis/${prevId}`)
                  }}
                >
                  Previous
                </PrimaryButton>
                <PrimaryButton
                  type="button"
                  variant="secondary"
                  disabled={rfiDetailOrder.indexOf(selectedRfiDetailId || 0) >= rfiDetailOrder.length - 1}
                  onClick={() => {
                    if (hasUnsavedRfiDetail && !confirm('You have unsaved RFI changes. Continue without saving?')) return
                    const currentIndex = rfiDetailOrder.indexOf(selectedRfiDetailId || 0)
                    if (currentIndex < 0 || currentIndex >= rfiDetailOrder.length - 1) return
                    const nextId = rfiDetailOrder[currentIndex + 1]
                    onNavigate(`/projects/${encodeURIComponent(selectedProject.project_id)}/rfis/${nextId}`)
                  }}
                >
                  Next
                </PrimaryButton>
              </div>
            </article>
          ) : (
            <>
              <article className="detail-card mx-auto w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
                <img src={selectedProject.image_url || BUILDING_PLACEHOLDER} alt="Project placeholder building" className="h-56 w-full object-cover" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-3xl font-semibold text-slate-900">{selectedProject.project_name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{selectedProject.address || 'No address'}</p>
                    </div>
                    <StatusBadge
                      label={selectedProject.priority || 'N/A'}
                      tone={selectedProject.priority === 'High' ? 'danger' : selectedProject.priority === 'Medium' ? 'warning' : 'info'}
                    />
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
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <input
                      type="text"
                      value={detailSearch}
                      onChange={(event) => setDetailSearch(event.target.value)}
                      placeholder={detailsView === 'submittals' ? 'Search submittal number or subject' : 'Search RFI number or subject'}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                    <select
                      value={detailTimingFilter}
                      onChange={(event) => setDetailTimingFilter(event.target.value as 'all' | 'late' | 'this_week')}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="all">All timing</option>
                      <option value="late">Late only</option>
                      <option value="this_week">Due this week</option>
                    </select>
                  </div>
                </div>
              </article>

              <div className="mt-6">
                <div className="relative mx-auto max-w-5xl">
                  {firstDetailRow.length > 0 ? (
                    <>
                      <span className="absolute left-1/2 top-[130px] hidden h-[46px] w-[2px] -translate-x-1/2 bg-brand-700/35 md:block" />
                      <span className="absolute left-1/2 top-[176px] hidden h-[2px] w-[36%] -translate-x-full -rotate-[20deg] bg-brand-700/30 md:block" />
                      <span className="absolute left-1/2 top-[176px] hidden h-[2px] w-[36%] rotate-[20deg] bg-brand-700/30 md:block" />
                    </>
                  ) : null}

                  <article className="detail-card relative z-10 mx-auto w-[260px] rounded-xl border border-brand-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Project</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{selectedProject.project_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{selectedProject.project_id}</p>
                  </article>

                  <div className="mt-14 grid gap-4 md:grid-cols-2">
                    {firstDetailRow.map((item, index) => (
                      <article
                        key={`${detailsView}-${item.id}`}
                        className="detail-card relative z-10 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        style={{ animationDelay: `${index * 70}ms` }}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {detailsView === 'submittals' ? `Submittal #${item.id}` : `RFI #${item.id}`}
                        </p>
                        <p className="mt-2 text-base font-semibold text-slate-900">
                          {detailsView === 'submittals'
                            ? ((item as SubmittalRecord).submittal_number || (item as SubmittalRecord).subject || 'Untitled')
                            : ((item as RfiRecord).rfi_number || (item as RfiRecord).subject || 'Untitled')}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge
                            label={
                              detailsView === 'submittals'
                                ? ((item as SubmittalRecord).overall_status || (item as SubmittalRecord).approval_status || 'Opened')
                                : ((item as RfiRecord).status || 'Opened')
                            }
                            tone={detailsView === 'submittals' ? (isSubmittalClosed(item as SubmittalRecord) ? 'success' : 'info') : (isRfiClosed(item as RfiRecord) ? 'success' : 'info')}
                          />
                          {isPastDue(detailsView === 'submittals' ? (item as SubmittalRecord).due_date : (item as RfiRecord).response_due) ? (
                            <StatusBadge label="Late" tone="danger" />
                          ) : isDueWithinSevenDays(detailsView === 'submittals' ? (item as SubmittalRecord).due_date : (item as RfiRecord).response_due) ? (
                            <StatusBadge label="Due This Week" tone="warning" />
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                          if (detailsView === 'submittals') {
                              if (hasUnsavedSubmittalDetail && !confirm('You have unsaved Submittal changes. Continue without saving?')) return
                              const selected = item as SubmittalRecord
                              setSelectedSubmittalDetailId(selected.id)
                              setSubmittalDraft({ ...selected })
                              onNavigate(`/projects/${encodeURIComponent(selectedProject.project_id)}/submittals/${selected.id}`)
                            } else {
                              if (hasUnsavedRfiDetail && !confirm('You have unsaved RFI changes. Continue without saving?')) return
                              const selected = item as RfiRecord
                              setSelectedRfiDetailId(selected.id)
                              setRfiDraft({ ...selected })
                              onNavigate(`/projects/${encodeURIComponent(selectedProject.project_id)}/rfis/${selected.id}`)
                            }
                          }}
                          className="mt-3 inline-flex rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                        >
                          Open {detailsView === 'submittals' ? 'Submittal Detail Page' : 'RFI Detail Page'}
                        </button>
                      </article>
                    ))}
                  </div>

                  {extraDetailRows.map((row, rowIndex) => (
                    <div key={`${detailsView}-extra-row-${rowIndex}`} className="relative mt-10">
                      <span className="absolute left-1/2 top-[-26px] hidden h-[26px] w-[2px] -translate-x-1/2 bg-brand-700/25 md:block" />
                      {row.length === 2 ? (
                        <>
                          <span className="absolute left-1/2 top-[20px] hidden h-[2px] w-[34%] -translate-x-full -rotate-[16deg] bg-brand-700/25 md:block" />
                          <span className="absolute left-1/2 top-[20px] hidden h-[2px] w-[34%] rotate-[16deg] bg-brand-700/25 md:block" />
                        </>
                      ) : null}
                      <div className="grid gap-4 md:grid-cols-2">
                        {row.map((item, index) => (
                          <article
                            key={`${detailsView}-${item.id}`}
                            className="detail-card relative z-10 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                            style={{ animationDelay: `${(rowIndex * 2 + index + 2) * 70}ms` }}
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                              {detailsView === 'submittals' ? `Submittal #${item.id}` : `RFI #${item.id}`}
                            </p>
                            <p className="mt-2 text-base font-semibold text-slate-900">
                              {detailsView === 'submittals'
                                ? ((item as SubmittalRecord).submittal_number || (item as SubmittalRecord).subject || 'Untitled')
                                : ((item as RfiRecord).rfi_number || (item as RfiRecord).subject || 'Untitled')}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <StatusBadge
                                label={
                                  detailsView === 'submittals'
                                    ? ((item as SubmittalRecord).overall_status || (item as SubmittalRecord).approval_status || 'Opened')
                                    : ((item as RfiRecord).status || 'Opened')
                                }
                                tone={detailsView === 'submittals' ? (isSubmittalClosed(item as SubmittalRecord) ? 'success' : 'info') : (isRfiClosed(item as RfiRecord) ? 'success' : 'info')}
                              />
                              {isPastDue(detailsView === 'submittals' ? (item as SubmittalRecord).due_date : (item as RfiRecord).response_due) ? (
                                <StatusBadge label="Late" tone="danger" />
                              ) : isDueWithinSevenDays(detailsView === 'submittals' ? (item as SubmittalRecord).due_date : (item as RfiRecord).response_due) ? (
                                <StatusBadge label="Due This Week" tone="warning" />
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (detailsView === 'submittals') {
                                  if (hasUnsavedSubmittalDetail && !confirm('You have unsaved Submittal changes. Continue without saving?')) return
                                  const selected = item as SubmittalRecord
                                  setSelectedSubmittalDetailId(selected.id)
                                  setSubmittalDraft({ ...selected })
                                  onNavigate(`/projects/${encodeURIComponent(selectedProject.project_id)}/submittals/${selected.id}`)
                                } else {
                                  if (hasUnsavedRfiDetail && !confirm('You have unsaved RFI changes. Continue without saving?')) return
                                  const selected = item as RfiRecord
                                  setSelectedRfiDetailId(selected.id)
                                  setRfiDraft({ ...selected })
                                  onNavigate(`/projects/${encodeURIComponent(selectedProject.project_id)}/rfis/${selected.id}`)
                                }
                              }}
                              className="mt-3 inline-flex rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                            >
                              Open {detailsView === 'submittals' ? 'Submittal Detail Page' : 'RFI Detail Page'}
                            </button>
                          </article>
                        ))}
                      </div>
                    </div>
                  ))}

                  {searchedDetailItems.length === 0 ? (
                    <div className="relative z-10 mx-auto mt-8 w-full max-w-md">
                      <EmptyState
                        title={`No ${detailsView} match your filters`}
                        description="Try changing open/closed, timing filter, or search query."
                        ctaLabel={detailsView === 'submittals' ? 'Show All Submittals' : 'Show All RFIs'}
                        onCta={() => {
                          setDetailSearch('')
                          setDetailTimingFilter('all')
                          if (detailsView === 'submittals') setSubmittalFilter('opened')
                          if (detailsView === 'rfis') setRfiFilter('opened')
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
      {!selectedProject ? (
      <>
      <SectionHeader
        title={editingProjectId ? 'Edit Project' : 'Projects'}
        subtitle="Manage project records, assign team roles, and open detail pages."
        actions={
          <PrimaryButton
            type="button"
            onClick={() => {
              if (showForm) {
                setEditingProjectId(null)
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
          >
            {showForm ? 'Hide Form' : 'Add Project'}
          </PrimaryButton>
        }
      />
      {showForm ? (
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[
          ['Project Name', 'project_name', 'text'],
          ['Address', 'address', 'text'],
          ['Image URL', 'image_url', 'url'],
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

      <div className="ui-scroll mt-6 overflow-x-auto">
        <table className="ui-table min-w-[900px]">
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
                      onNavigate(`/projects/${encodeURIComponent(item.project_id)}`)
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
                          image_url: item.image_url ?? '',
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
            {projects.length === 0 ? (
              <tr>
                <td colSpan={6} className="border px-3 py-8">
                  <EmptyState
                    title="No projects yet"
                    description="Start by creating a project. Then you can open Project Details, Submittals and RFIs."
                    ctaLabel="Add Project"
                    onCta={() => setShowForm(true)}
                  />
                </td>
              </tr>
            ) : null}
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
