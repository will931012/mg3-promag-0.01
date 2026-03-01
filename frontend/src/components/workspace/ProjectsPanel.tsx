import { FormEvent, useEffect, useMemo, useState } from 'react'

import { EOR_TYPES } from '../../app/eorTypes'
import type { EorType } from '../../app/eorTypes'
import { toNullableString } from '../../app/formUtils'
import { createAor, createEor, createProject, deleteProject, fetchAors, fetchEors, updateProject } from '../../services/workspaceService'
import type { AorRecord, EorRecord, ProjectRecord } from '../../types/workspace'

type ProjectsPanelProps = {
  token: string
  projects: ProjectRecord[]
  setMessage: (message: string) => void
  refreshWorkspace: (token: string) => Promise<void>
}

type ProjectForm = Omit<ProjectRecord, 'project_id'>
const defaultEorType: EorType = 'Civil EOR'
const MULTI_VALUE_SEPARATOR = ' | '

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

  const handleCreateAor = async () => {
    const name = newAorName.trim()
    if (!name) return setMessage('AOR name is required.')
    const res = await createAor(token, { name })
    if (!res.ok || !res.data) return setMessage('Failed to create AOR.')
    const createdAor = res.data
    await loadAors()
    if (addCreatedAorToProject) {
      setForm((prev) => ({ ...prev, aor: addUniqueMultiValue(prev.aor, createdAor.name) }))
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
    setSelectedEorType(defaultEorType)
    setAorInput('')
    setEorInput('')
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
          ['EOR', 'eor', 'text'],
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
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={aorInput}
                    onFocus={() => setShowAorSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowAorSuggestions(false), 120)}
                    onChange={(e) => {
                      setAorInput(e.target.value)
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
                    const next = addUniqueMultiValue(form.aor, aorInput)
                    setForm((prev) => ({ ...prev, [key]: next }))
                    setAorInput('')
                    setShowAorSuggestions(false)
                  }}
                  className="mt-2 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white"
                >
                  Add AOR to Project
                </button>
                <button
                  type="button"
                  onClick={() => setShowAorModal(true)}
                  className="mt-2 rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  Add AOR to DB
                </button>
                {form.aor ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {splitMultiValues(form.aor).map((item) => (
                      <span key={item} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {item}
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, aor: removeMultiValue(prev.aor, item) }))}
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
                        setSelectedEorType(defaultEorType)
                        setAorInput('')
                        setEorInput('')
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
    </section>
  )
}
