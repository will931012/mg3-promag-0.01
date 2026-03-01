import { FormEvent, useMemo, useState } from 'react'

import { toNullableNumber, toNullableString } from '../../app/formUtils'
import { createSubmittal, deleteSubmittal, updateSubmittal } from '../../services/workspaceService'
import type { ProjectRecord, SubmittalRecord } from '../../types/workspace'

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

const emptyForm: Omit<SubmittalRecord, 'id'> = {
  project_id: '',
  division_csi: '',
  submittal_number: '',
  description: '',
  contractor: '',
  date_received: '',
  sent_to_aor: '',
  sent_to_eor: '',
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.project_id) return setMessage('Select a project first.')

    const payload = {
      project_id: toNullableString(form.project_id),
      division_csi: toNullableString(form.division_csi),
      submittal_number: toNullableString(form.submittal_number),
      description: toNullableString(form.description),
      contractor: toNullableString(form.contractor),
      date_received: toNullableString(form.date_received),
      sent_to_aor: toNullableString(form.sent_to_aor),
      sent_to_eor: toNullableString(form.sent_to_eor),
      approval_status: toNullableString(form.approval_status),
      revision: toNullableString(form.revision),
      due_date: toNullableString(form.due_date),
      days_pending: toNullableNumber(form.days_pending),
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
          <input value={form.overall_status ?? ''} onChange={(e) => setForm((p) => ({ ...p, overall_status: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm lg:col-span-2">Description
          <input value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Due Date
          <input type="date" value={form.due_date ?? ''} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Days Pending
          <input type="number" value={form.days_pending ?? ''} onChange={(e) => setForm((p) => ({ ...p, days_pending: toNullableNumber(e.target.value) }))} className="mt-1 w-full rounded border px-2 py-2" />
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
