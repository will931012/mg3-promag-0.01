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
  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.project_id, p.project_name])),
    [projects]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

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
    await refreshWorkspace(token)
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{editingId ? 'Edit Submittal' : 'New Submittal'}</h2>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">Project
          <select value={form.project_id ?? ''} onChange={(e) => setForm((p) => ({ ...p, project_id: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2">
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.project_id} value={project.project_id}>
                {project.project_name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">Submittal #
          <input value={form.submittal_number ?? ''} onChange={(e) => setForm((p) => ({ ...p, submittal_number: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Division CSI
          <input value={form.division_csi ?? ''} onChange={(e) => setForm((p) => ({ ...p, division_csi: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
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
            <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm) }} className="rounded bg-slate-200 px-4 py-2 text-sm font-semibold">
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
                    <button onClick={() => { setEditingId(item.id); setForm({ ...item }) }} className="rounded bg-slate-200 px-2 py-1 text-xs">Edit</button>
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
