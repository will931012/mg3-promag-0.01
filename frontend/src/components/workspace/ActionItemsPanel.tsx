import { FormEvent, useMemo, useState } from 'react'

import { toNullableNumber, toNullableString } from '../../app/formUtils'
import { createActionItem, deleteActionItem, updateActionItem } from '../../services/workspaceService'
import type { ActionItemRecord, ProjectRecord } from '../../types/workspace'

type ActionItemsPanelProps = {
  token: string
  projects: ProjectRecord[]
  actionItems: ActionItemRecord[]
  setMessage: (message: string) => void
  refreshWorkspace: (token: string) => Promise<void>
}

const emptyForm: Omit<ActionItemRecord, 'id'> = {
  project_id: '',
  task: '',
  description: '',
  assigned_to: '',
  start_date: '',
  due_date: '',
  status: '',
  priority: '',
  days_left: null,
  notes: '',
}

export default function ActionItemsPanel({ token, projects, actionItems, setMessage, refreshWorkspace }: ActionItemsPanelProps) {
  const [form, setForm] = useState<Omit<ActionItemRecord, 'id'>>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.project_id, p.project_name])),
    [projects]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = {
      project_id: toNullableString(form.project_id),
      task: toNullableString(form.task),
      description: toNullableString(form.description),
      assigned_to: toNullableString(form.assigned_to),
      start_date: toNullableString(form.start_date),
      due_date: toNullableString(form.due_date),
      status: toNullableString(form.status),
      priority: toNullableString(form.priority),
      days_left: toNullableNumber(form.days_left),
      notes: toNullableString(form.notes),
    }
    const res = editingId ? await updateActionItem(token, editingId, payload) : await createActionItem(token, payload)
    if (!res.ok) return setMessage('Failed to save action item.')
    setMessage(editingId ? 'Action item updated.' : 'Action item created.')
    setEditingId(null)
    setForm(emptyForm)
    await refreshWorkspace(token)
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{editingId ? 'Edit Action Item' : 'New Action Item'}</h2>
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
        <label className="text-sm">Task
          <input value={form.task ?? ''} onChange={(e) => setForm((p) => ({ ...p, task: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Assigned To
          <input value={form.assigned_to ?? ''} onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Status
          <input value={form.status ?? ''} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Priority
          <input value={form.priority ?? ''} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Due Date
          <input type="date" value={form.due_date ?? ''} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm">Days Left
          <input type="number" value={form.days_left ?? ''} onChange={(e) => setForm((p) => ({ ...p, days_left: toNullableNumber(e.target.value) }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <label className="text-sm lg:col-span-2">Description
          <input value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <div className="flex gap-2 lg:col-span-4">
          <button type="submit" className="rounded bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
            {editingId ? 'Update Action Item' : 'Create Action Item'}
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
          <thead><tr className="bg-slate-100">{['ID', 'Project', 'Task', 'Assigned To', 'Status', 'Actions'].map((h) => <th key={h} className="border px-3 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {actionItems.map((item) => (
              <tr key={item.id}>
                <td className="border px-3 py-2">{item.id}</td>
                <td className="border px-3 py-2">{item.project_id ? (projectNameById[item.project_id] ?? 'Unknown Project') : ''}</td>
                <td className="border px-3 py-2">{item.task}</td>
                <td className="border px-3 py-2">{item.assigned_to}</td>
                <td className="border px-3 py-2">{item.status}</td>
                <td className="border px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(item.id); setForm({ ...item }) }} className="rounded bg-slate-200 px-2 py-1 text-xs">Edit</button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete action item ${item.id}?`)) return
                        const res = await deleteActionItem(token, item.id)
                        if (!res.ok) return setMessage('Failed to delete action item.')
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
