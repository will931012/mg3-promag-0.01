import { FormEvent, useEffect, useMemo, useState } from 'react'

import { toNullableString } from '../../app/formUtils'
import { createAor, createProject, deleteProject, fetchAors, updateProject } from '../../services/workspaceService'
import type { AorRecord, ProjectRecord } from '../../types/workspace'

type ProjectsPanelProps = {
  token: string
  projects: ProjectRecord[]
  setMessage: (message: string) => void
  refreshWorkspace: (token: string) => Promise<void>
}

type ProjectForm = Omit<ProjectRecord, 'project_id'>

const emptyProjectForm: ProjectForm = {
  project_name: '',
  address: '',
  developer: '',
  aor: '',
  eor: '',
  start_date: '',
  end_date: '',
  status: '',
  priority: '',
  notes: '',
}

export default function ProjectsPanel({ token, projects, setMessage, refreshWorkspace }: ProjectsPanelProps) {
  const [form, setForm] = useState<ProjectForm>(emptyProjectForm)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [aors, setAors] = useState<AorRecord[]>([])
  const [aorSearch, setAorSearch] = useState('')
  const [showAorModal, setShowAorModal] = useState(false)
  const [newAorName, setNewAorName] = useState('')

  useEffect(() => {
    let mounted = true
    const loadAors = async () => {
      const next = await fetchAors(token)
      if (mounted) setAors(next)
    }
    loadAors()
    return () => { mounted = false }
  }, [token])

  const filteredAors = useMemo(() => {
    const query = aorSearch.trim().toLowerCase()
    if (!query) return aors
    return aors.filter((item) => item.name.toLowerCase().includes(query))
  }, [aors, aorSearch])

  const handleCreateAor = async () => {
    const name = newAorName.trim()
    if (!name) return setMessage('AOR name is required.')
    const res = await createAor(token, { name })
    if (!res.ok || !res.data) return setMessage('Failed to create AOR.')

    const next = [...aors, res.data].sort((a, b) => a.name.localeCompare(b.name))
    setAors(next)
    setForm((prev) => ({ ...prev, aor: res.data?.name ?? prev.aor }))
    setAorSearch('')
    setNewAorName('')
    setShowAorModal(false)
    setMessage('AOR created.')
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
        start_date: toNullableString(form.start_date),
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
        start_date: toNullableString(form.start_date),
        end_date: toNullableString(form.end_date),
        status: toNullableString(form.status),
        priority: toNullableString(form.priority),
        notes: toNullableString(form.notes),
      })
      if (!res.ok) return setMessage('Failed to create project.')
      setMessage('Project created.')
    }

    setForm(emptyProjectForm)
    await refreshWorkspace(token)
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{editingProjectId ? 'Edit Project' : 'New Project'}</h2>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[
          ['Project Name', 'project_name', 'text'],
          ['Address', 'address', 'text'],
          ['Developer', 'developer', 'text'],
          ['AOR', 'aor', 'text'],
          ['EOR', 'eor', 'date'],
          ['Start Date', 'start_date', 'date'],
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
                <input
                  type="text"
                  value={aorSearch}
                  onChange={(e) => setAorSearch(e.target.value)}
                  placeholder="Search AOR"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
                <select
                  value={String(form[key as keyof ProjectForm] ?? '')}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">Select AOR</option>
                  {filteredAors.map((item) => (
                    <option key={item.id} value={item.name}>{item.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAorModal(true)}
                  className="mt-2 rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  Add AOR
                </button>
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
              }}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

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
                <td className="border px-3 py-2">{item.project_name}</td>
                <td className="border px-3 py-2">{item.developer ?? ''}</td>
                <td className="border px-3 py-2">{item.status ?? ''}</td>
                <td className="border px-3 py-2">{item.priority ?? ''}</td>
                <td className="border px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingProjectId(item.project_id)
                        setForm({
                          project_name: item.project_name ?? '',
                          address: item.address ?? '',
                          developer: item.developer ?? '',
                          aor: item.aor ?? '',
                          eor: item.eor ?? '',
                          start_date: item.start_date ?? '',
                          end_date: item.end_date ?? '',
                          status: item.status ?? '',
                          priority: item.priority ?? '',
                          notes: item.notes ?? '',
                        })
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
                }}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
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
