import { FormEvent, useEffect, useMemo, useState } from 'react'

import { EOR_TYPES } from '../../app/eorTypes'
import type { EorType } from '../../app/eorTypes'
import { toNullableString } from '../../app/formUtils'
import { createProvider, createRfi, deleteRfi, fetchAors, fetchEors, fetchProviders, updateRfi } from '../../services/workspaceService'
import type { AorRecord, EorRecord, ProjectRecord, ProviderRecord, RfiRecord } from '../../types/workspace'

type RfisPanelProps = {
  token: string
  projects: ProjectRecord[]
  rfis: RfiRecord[]
  setMessage: (message: string) => void
  refreshWorkspace: (token: string) => Promise<void>
}

const STATUS_OPTIONS = ['Approved', 'Under Revision', 'Not Approved'] as const
const MULTI_VALUE_SEPARATOR = ' | '
const todayIsoDate = () => new Date().toISOString().slice(0, 10)

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

const emptyForm: Omit<RfiRecord, 'id'> = {
  project_id: '',
  rfi_number: '',
  subject: '',
  description: '',
  from_contractor: '',
  date_sent: '',
  sent_to_aor: '',
  sent_to_eor: '',
  sent_to_provider: '',
  sent_to_date: '',
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
  const [projectSearch, setProjectSearch] = useState('')
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false)
  const [aors, setAors] = useState<AorRecord[]>([])
  const [eors, setEors] = useState<EorRecord[]>([])
  const [providers, setProviders] = useState<ProviderRecord[]>([])
  const [sentToAorInput, setSentToAorInput] = useState('')
  const [sentToEorInput, setSentToEorInput] = useState('')
  const [sentToProviderInput, setSentToProviderInput] = useState('')
  const [showAorSuggestions, setShowAorSuggestions] = useState(false)
  const [showEorSuggestions, setShowEorSuggestions] = useState(false)
  const [showProviderSuggestions, setShowProviderSuggestions] = useState(false)
  const [selectedEorType, setSelectedEorType] = useState<EorType>('Civil EOR')
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [newProviderName, setNewProviderName] = useState('')
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
  const sortedAors = useMemo(() => [...aors].sort((a, b) => a.name.localeCompare(b.name)), [aors])
  const filteredAors = useMemo(() => {
    const query = sentToAorInput.trim().toLowerCase()
    if (query.length < 1) return []
    return sortedAors.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 8)
  }, [sentToAorInput, sortedAors])
  const filteredEors = useMemo(() => {
    const query = sentToEorInput.trim().toLowerCase()
    if (query.length < 1) return []
    return eors
      .filter((item) => item.type === selectedEorType && item.name.toLowerCase().includes(query))
      .slice(0, 8)
  }, [eors, selectedEorType, sentToEorInput])
  const sortedProviders = useMemo(() => [...providers].sort((a, b) => a.name.localeCompare(b.name)), [providers])
  const filteredProviders = useMemo(() => {
    const query = sentToProviderInput.trim().toLowerCase()
    if (query.length < 1) return []
    return sortedProviders.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 8)
  }, [sentToProviderInput, sortedProviders])

  useEffect(() => {
    let mounted = true
    const loadLists = async () => {
      const [nextAors, nextEors, nextProviders] = await Promise.all([fetchAors(token), fetchEors(token), fetchProviders(token)])
      if (!mounted) return
      setAors(nextAors)
      setEors(nextEors)
      setProviders(nextProviders)
    }
    loadLists()
    return () => { mounted = false }
  }, [token])

  const handleCreateProvider = async () => {
    const name = newProviderName.trim()
    if (!name) return setMessage('Provider name is required.')
    const res = await createProvider(token, { name })
    const createdProvider = res.data
    if (!res.ok || !createdProvider) return setMessage('Failed to create provider.')
    const nextProviders = [...providers, createdProvider].sort((a, b) => a.name.localeCompare(b.name))
    setProviders(nextProviders)
    setSentToProviderInput(createdProvider.name)
    setForm((p) => ({ ...p, sent_to_provider: createdProvider.name }))
    setNewProviderName('')
    setShowProviderModal(false)
    setMessage('Provider created.')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = {
      project_id: toNullableString(form.project_id),
      rfi_number: toNullableString(form.rfi_number),
      subject: toNullableString(form.subject),
      description: toNullableString(form.description),
      from_contractor: toNullableString(form.from_contractor),
      date_sent: toNullableString(form.date_sent),
      sent_to_aor: toNullableString(form.sent_to_aor),
      sent_to_eor: toNullableString(form.sent_to_eor),
      sent_to_provider: toNullableString(form.sent_to_provider),
      sent_to_date: toNullableString(form.sent_to_date),
      response_due: toNullableString(form.response_due),
      date_answered: toNullableString(form.date_answered),
      status: toNullableString(form.status),
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
    setSentToAorInput('')
    setSentToEorInput('')
    setSentToProviderInput('')
    setSelectedEorType('Civil EOR')
    await refreshWorkspace(token)
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{editingId ? 'Edit RFI' : 'New RFI'}</h2>
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
        <label className="text-sm lg:col-span-2">Description
          <textarea
            value={form.description ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={4}
            className="mt-1 w-full rounded border px-2 py-2"
          />
        </label>
        <div className="text-sm lg:col-span-2">
          <p className="font-medium text-slate-700">Sent To</p>
          <div className="mt-2">
            <label className="text-xs text-slate-600">AOR</label>
            <div className="relative mt-1">
              <input
                value={sentToAorInput}
                onFocus={() => setShowAorSuggestions(true)}
                onBlur={() => setTimeout(() => setShowAorSuggestions(false), 120)}
                onChange={(e) => {
                  setSentToAorInput(e.target.value)
                  setForm((p) => ({ ...p, sent_to_aor: e.target.value }))
                  setShowAorSuggestions(true)
                }}
                placeholder="Search AOR"
                className="w-full rounded border px-2 py-2"
              />
              {showAorSuggestions ? (
                <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded border border-slate-200 bg-white shadow-md">
                  {sentToAorInput.trim().length < 1 ? null : filteredAors.length > 0 ? (
                    filteredAors.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={() => {
                          setSentToAorInput(item.name)
                          setForm((p) => ({ ...p, sent_to_aor: item.name, sent_to_date: p.sent_to_date || todayIsoDate() }))
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
                const trimmed = sentToAorInput.trim()
                if (!trimmed) return
                setForm((p) => ({ ...p, sent_to_aor: trimmed, sent_to_date: p.sent_to_date || todayIsoDate() }))
                setShowAorSuggestions(false)
              }}
              className="mt-2 rounded bg-brand-700 px-3 py-2 text-xs font-semibold text-white"
            >
              Add AOR
            </button>
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
            <div className="relative mt-2">
              <input
                value={sentToEorInput}
                onFocus={() => setShowEorSuggestions(true)}
                onBlur={() => setTimeout(() => setShowEorSuggestions(false), 120)}
                onChange={(e) => {
                  setSentToEorInput(e.target.value)
                  setShowEorSuggestions(true)
                }}
                placeholder={`Search ${selectedEorType}`}
                className="w-full rounded border px-2 py-2"
              />
              {showEorSuggestions ? (
                <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded border border-slate-200 bg-white shadow-md">
                  {sentToEorInput.trim().length < 1 ? null : filteredEors.length > 0 ? (
                    filteredEors.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={() => {
                          setSentToEorInput(item.name)
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
                const trimmed = sentToEorInput.trim()
                if (!trimmed) return
                const formatted = `${selectedEorType}: ${trimmed}`
                const next = addUniqueMultiValue(form.sent_to_eor, formatted)
                setForm((p) => ({ ...p, sent_to_eor: next, sent_to_date: p.sent_to_date || todayIsoDate() }))
                setSentToEorInput('')
                setShowEorSuggestions(false)
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
            <label className="text-xs text-slate-600">Provider</label>
            <div className="relative mt-1">
              <input
                value={sentToProviderInput}
                onFocus={() => setShowProviderSuggestions(true)}
                onBlur={() => setTimeout(() => setShowProviderSuggestions(false), 120)}
                onChange={(e) => {
                  setSentToProviderInput(e.target.value)
                  setForm((p) => ({ ...p, sent_to_provider: e.target.value }))
                  setShowProviderSuggestions(true)
                }}
                placeholder="Search Provider"
                className="w-full rounded border px-2 py-2"
              />
              {showProviderSuggestions ? (
                <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded border border-slate-200 bg-white shadow-md">
                  {sentToProviderInput.trim().length < 1 ? null : filteredProviders.length > 0 ? (
                    filteredProviders.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={() => {
                          setSentToProviderInput(item.name)
                          setForm((p) => ({ ...p, sent_to_provider: item.name }))
                          setShowProviderSuggestions(false)
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
                  const trimmed = sentToProviderInput.trim()
                  if (!trimmed) return
                  setForm((p) => ({ ...p, sent_to_provider: trimmed }))
                  setShowProviderSuggestions(false)
                }}
                className="rounded bg-brand-700 px-3 py-2 text-xs font-semibold text-white"
              >
                Add Provider
              </button>
              <button
                type="button"
                onClick={() => setShowProviderModal(true)}
                className="rounded bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Add Provider to DB
              </button>
            </div>
            {form.sent_to_provider ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  {form.sent_to_provider}
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, sent_to_provider: '' }))}
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
        <label className="text-sm">Response Due
          <input type="date" value={form.response_due ?? ''} onChange={(e) => setForm((p) => ({ ...p, response_due: e.target.value }))} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        <div className="flex gap-2 lg:col-span-4">
          <button type="submit" className="rounded bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
            {editingId ? 'Update RFI' : 'Create RFI'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null)
                setForm(emptyForm)
                setProjectSearch('')
                setSentToAorInput('')
                setSentToEorInput('')
                setSentToProviderInput('')
                setSelectedEorType('Civil EOR')
              }}
              className="rounded bg-slate-200 px-4 py-2 text-sm font-semibold"
            >
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
                    <button
                      onClick={() => {
                        setEditingId(item.id)
                        setForm({ ...item })
                        setProjectSearch(item.project_id ? (projectNameById[item.project_id] ?? '') : '')
                        setSentToAorInput(item.sent_to_aor ?? '')
                        setSentToEorInput('')
                        setSentToProviderInput(item.sent_to_provider ?? '')
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
          </tbody>
        </table>
      </div>

      {showProviderModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Add Provider</h3>
            <label className="mt-3 block text-sm text-slate-700">
              Provider Name
              <input
                type="text"
                value={newProviderName}
                onChange={(e) => setNewProviderName(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleCreateProvider}
                className="rounded bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Save Provider
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProviderModal(false)
                  setNewProviderName('')
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
