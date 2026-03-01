import { FormEvent, useMemo, useState } from 'react'

import { toNullableNumber, toNullableString } from '../../app/formUtils'
import { createRfi, deleteRfi, updateRfi } from '../../services/workspaceService'
import type { ProjectRecord, RfiRecord } from '../../types/workspace'

type RfisPanelProps = {
  token: string
  projects: ProjectRecord[]
  rfis: RfiRecord[]
  setMessage: (message: string) => void
  refreshWorkspace: (token: string) => Promise<void>
}

const emptyForm: Omit<RfiRecord, 'id'> = {
  project_id: '',
  rfi_number: '',
  subject: '',
  description: '',
  from_contractor: '',
  date_sent: '',
  sent_to: '',
  response_due: '',
  date_answered: '',
  status: '',
  days_open: null,
  responsible: '',
  notes: '',
}

export default function RfisPanel({ token, projects, rfis, setMessage, refreshWorkspace }: RfisPanelProps) {
  const [form, setForm] = useState<Omit<RfiRecord, 'id'>>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.project_id, p.project_name])),
    [projects]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = {
      project_id: toNullableString(form.project_id),
      rfi_number: toNullableString(form.rfi_number),
      subject: toNullableString(form.subject),
      description: toNullableString(form.description),
      from_contractor: toNullableString(form.from_contractor),
      date_sent: toNullableString(form.date_sent),
      sent_to: toNullableString(form.sent_to),
      response_due: toNullableString(form.response_due),
      date_answered: toNullableString(form.date_answered),
      status: toNullableString(form.status),
      days_open: toNullableNumber(form.days_open),
      responsible: toNullableString(form.responsible),
      notes: toNullableString(form.notes),
    }
    const res = editingId ? await updateRfi(token, editingId, payload) : await createRfi(token, payload)
    if (!res.ok) return setMessage('Failed to save RFI.')
    setMessage(editingId ? 'RFI updated.' : 'RFI created.')
    setEditingId(null)
    setForm(emptyForm)
    await refreshWorkspace(token)
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{editingId ? 'Edit RFI' : 'New RFI'}</h2>
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
        <label className="text-sm">RFI #
          <input value={form.rfi_number ?? ''} onChange={(e) => setForm((p) => ({ ...p, rfi_number: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Subject
          <input value={form.subject ?? ''} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Status
          <input value={form.status ?? ''} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm lg:col-span-2">Description
          <input value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Response Due
          <input type="date" value={form.response_due ?? ''} onChange={(e) => setForm((p) => ({ ...p, response_due: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Days Open
          <input type="number" value={form.days_open ?? ''} onChange={(e) => setForm((p) => ({ ...p, days_open: toNullableNumber(e.target.value) }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <div className="flex gap-2 lg:col-span-4">
          <button type="submit" className="rounded bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
            {editingId ? 'Update RFI' : 'Create RFI'}
          </button>
          {editingId ? (
            <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm) }} className="rounded bg-slate-200 px-4 py-2 text-sm font-semibold">
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead><tr className="bg-slate-100">{['ID', 'Project', 'RFI #', 'Subject', 'Status', 'Actions'].map((h) => <th key={h} className="border px-3 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {rfis.map((item) => (
              <tr key={item.id}>
                <td className="border px-3 py-2">{item.id}</td>
                <td className="border px-3 py-2">{item.project_id ? (projectNameById[item.project_id] ?? 'Unknown Project') : ''}</td>
                <td className="border px-3 py-2">{item.rfi_number}</td>
                <td className="border px-3 py-2">{item.subject}</td>
                <td className="border px-3 py-2">{item.status}</td>
                <td className="border px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(item.id); setForm({ ...item }) }} className="rounded bg-slate-200 px-2 py-1 text-xs">Edit</button>
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
          </tbody>
        </table>
      </div>
    </section>
  )
}
