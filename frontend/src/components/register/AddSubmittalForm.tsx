import { FormEvent, useMemo, useState } from 'react'

import PrimaryButton from '../common/PrimaryButton'
import StatusBadge from '../common/StatusBadge'
import { alertTone, ballTone, formatDate, inputClass, statusTone } from './registerUi'
import { createLogEntry, createRegisterItem, responseDetail, updateRegisterItem } from '../../services/registerService'
import type { ProjectItemFields, RegisterItem, RegisterMeta } from '../../types/register'

type AddSubmittalFormProps = {
  token: string
  projectId: string
  items: RegisterItem[]
  meta: RegisterMeta | null
  reviewDays: number
  onSaved: (item: RegisterItem, isNew: boolean) => void
  onCancel: () => void
  setMessage: (message: string) => void
}

type Draft = {
  submittal_no: string
  description: string
  submittal_type: string
  reviewer: string
  subcontractor: string
  rev: string
  received_from_sub: string
  date_sent: string
  returned_by_reviewer: string
  action_code: string
  returned_to_sub: string
  lead_time_weeks: string
  needed_on_site: string
}

const emptyDraft: Draft = {
  submittal_no: '',
  description: '',
  submittal_type: '',
  reviewer: '',
  subcontractor: '',
  rev: '0',
  received_from_sub: '',
  date_sent: '',
  returned_by_reviewer: '',
  action_code: '',
  returned_to_sub: '',
  lead_time_weeks: '',
  needed_on_site: '',
}

const CLOSING_CODES = new Set(['Approved', 'Approved as Noted', 'For Record Only'])
const SUGGESTION_LIMIT = 8

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}
const addDays = (iso: string, days: number) => new Date((dayNumber(iso) + days) * 86_400_000).toISOString().slice(0, 10)
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())

/**
 * Preview of the calculated columns (same rules as the backend's register-status.js) so the
 * user sees what the row will look like before saving.
 */
function previewRow(draft: Draft, reviewDays: number) {
  const today = todayIso()
  const leadTime = draft.lead_time_weeks.trim() === '' ? null : Number(draft.lead_time_weeks)
  const submitBy = draft.needed_on_site && leadTime !== null && Number.isFinite(leadTime) ? addDays(draft.needed_on_site, -(leadTime * 7) - reviewDays) : null
  const submitted = Boolean(draft.received_from_sub || draft.date_sent)
  if (!submitted) {
    const late = submitBy && dayNumber(today) > dayNumber(submitBy)
    return { status: 'Not submitted', ball: 'Subcontractor', days: null as number | null, submitBy, alert: late ? 'LATE TO SUBMIT' : '' }
  }
  let ball: string
  if (draft.returned_to_sub) ball = CLOSING_CODES.has(draft.action_code) ? 'Closed' : 'Subcontractor'
  else if (draft.returned_by_reviewer) ball = 'GC'
  else if (draft.date_sent) ball = draft.reviewer || 'Reviewer'
  else ball = 'GC'
  const moves = [draft.received_from_sub, draft.date_sent, draft.returned_by_reviewer, draft.returned_to_sub].filter(Boolean).map(dayNumber)
  const days = ball === 'Closed' || !moves.length ? null : dayNumber(today) - Math.max(...moves)
  let alert = ''
  if (draft.needed_on_site && ball !== 'Closed' && dayNumber(today) > dayNumber(draft.needed_on_site)) alert = 'NEEDED ON SITE — NOT APPROVED'
  else if (draft.date_sent && !draft.returned_by_reviewer && dayNumber(today) > dayNumber(addDays(draft.date_sent, reviewDays))) alert = 'REVIEW OVERDUE'
  else if (draft.returned_by_reviewer && !draft.action_code) alert = 'ENTER ACTION CODE'
  return { status: draft.action_code || 'In review', ball, days, submitBy, alert }
}

export default function AddSubmittalForm({ token, projectId, items, meta, reviewDays, onSaved, onCancel, setMessage }: AddSubmittalFormProps) {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [picked, setPicked] = useState<RegisterItem | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((prev) => ({ ...prev, [key]: value }))

  const suggestions = useMemo(() => {
    const words = draft.description.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length || picked) return []
    return items
      .filter((item) => {
        const text = `${item.description} ${item.submittal_no} ${item.spec_section}`.toLowerCase()
        return words.every((word) => text.includes(word))
      })
      .slice(0, SUGGESTION_LIMIT)
  }, [draft.description, items, picked])

  const subcontractorOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.subcontractor).filter(Boolean))).sort(),
    [items]
  )

  const pick = (item: RegisterItem) => {
    setPicked(item)
    setShowSuggestions(false)
    setDraft((prev) => ({
      ...prev,
      submittal_no: item.submittal_no,
      description: item.description,
      submittal_type: item.submittal_type,
      reviewer: item.reviewer,
      subcontractor: item.subcontractor || prev.subcontractor,
      rev: String(item.latest_rev === null ? 0 : item.latest_rev + 1),
      lead_time_weeks: item.lead_time_weeks === null ? prev.lead_time_weeks : String(item.lead_time_weeks),
      needed_on_site: item.needed_on_site ?? prev.needed_on_site,
    }))
  }

  const unpick = () => {
    setPicked(null)
    setDraft((prev) => ({ ...prev, submittal_no: '', rev: '0' }))
  }

  const preview = previewRow(draft, reviewDays)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const leadTime = draft.lead_time_weeks.trim()
    const itemFields: Partial<ProjectItemFields> = {
      submittal_no: draft.submittal_no.trim(),
      description: draft.description.trim(),
      submittal_type: draft.submittal_type,
      reviewer: draft.reviewer,
      subcontractor: draft.subcontractor.trim(),
      lead_time_weeks: leadTime === '' ? null : Number(leadTime),
      needed_on_site: draft.needed_on_site || null,
      in_use: true,
    }
    setSaving(true)
    try {
      // 1. The register row: reuse the picked one (from the master list) or add a project item.
      const itemRes = picked
        ? await updateRegisterItem(token, picked.id, itemFields)
        : await createRegisterItem(token, projectId, itemFields)
      if (!itemRes.ok || !itemRes.data) return setMessage(responseDetail(itemRes.data, 'Failed to save the submittal.'))
      let saved = itemRes.data

      // 2. The submission (Rev), when it has been received or sent.
      if (draft.received_from_sub || draft.date_sent) {
        const logRes = await createLogEntry(token, saved.id, {
          rev: Number(draft.rev || 0),
          received_from_sub: draft.received_from_sub || null,
          sent_to: draft.date_sent ? draft.reviewer : '',
          date_sent: draft.date_sent || null,
          returned_by_reviewer: draft.returned_by_reviewer || null,
          action_code: draft.action_code,
          returned_to_sub: draft.returned_to_sub || null,
        })
        if (!logRes.ok || !logRes.data) {
          onSaved(saved, !picked)
          return setMessage(responseDetail(logRes.data, `Saved ${saved.submittal_no}, but the submission failed. Open it to log Rev ${draft.rev}.`))
        }
        saved = logRes.data
      }
      onSaved(saved, !picked)
      setMessage(`Saved ${saved.submittal_no}${saved.submissions ? ` (Rev ${saved.latest_rev})` : ''}.`)
    } finally {
      setSaving(false)
    }
  }

  const dateInput = (key: keyof Draft, label: string) => (
    <label className="text-sm text-slate-700">
      {label}
      <input type="date" value={draft[key]} onChange={(e) => set(key, e.target.value)} className={inputClass} />
    </label>
  )

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="mt-3 rounded-xl border border-slate-200 bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">Add submittal</p>
        {picked ? (
          <span className="flex items-center gap-2 text-xs text-slate-600">
            From the master list: <span className="font-semibold">{picked.submittal_no}</span>
            {picked.submissions ? ` · ${picked.submissions} submission(s) already, this will be Rev ${draft.rev}` : null}
            <button type="button" onClick={unpick} className="font-semibold text-brand-700 hover:underline">Not this one</button>
          </span>
        ) : (
          <span className="text-xs text-slate-500">Type the description to pick an item from the master list, or enter a new one.</span>
        )}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <label className="text-sm text-slate-700" htmlFor="add-submittal-description">Description</label>
          <input
            id="add-submittal-description"
            required
            autoFocus
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-controls="add-submittal-suggestions"
            value={draft.description}
            onChange={(e) => {
              set('description', e.target.value)
              setShowSuggestions(true)
              setHighlight(0)
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={(e) => {
              if (!showSuggestions || !suggestions.length) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setHighlight((h) => (h + 1) % suggestions.length)
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
              } else if (e.key === 'Enter') {
                e.preventDefault()
                pick(suggestions[highlight])
              } else if (e.key === 'Escape') {
                setShowSuggestions(false)
              }
            }}
            className={inputClass}
          />
          {showSuggestions && suggestions.length ? (
            <ul id="add-submittal-suggestions" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-surface shadow-lg">
              {suggestions.map((item, index) => (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={index === highlight}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(item)
                  }}
                  onMouseEnter={() => setHighlight(index)}
                  className={`cursor-pointer px-3 py-2 text-sm ${index === highlight ? 'bg-slate-100' : ''}`}
                >
                  <span className="font-medium text-slate-900">{item.description}</span>
                  <span className="block text-xs text-slate-500">
                    {[item.submittal_no, item.submittal_type, item.reviewer, item.submissions ? `${item.submissions} submitted` : item.in_use ? null : 'not used yet']
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <label className="text-sm text-slate-700">Submittal No.
          <input required value={draft.submittal_no} onChange={(e) => set('submittal_no', e.target.value)} placeholder="08 44 00-03" className={inputClass} />
        </label>
        <label className="text-sm text-slate-700">Type
          <select value={draft.submittal_type} onChange={(e) => set('submittal_type', e.target.value)} className={inputClass}>
            <option value="" />
            {(meta?.submittal_types ?? []).map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="text-sm text-slate-700">Reviewer
          <select value={draft.reviewer} onChange={(e) => set('reviewer', e.target.value)} className={inputClass}>
            <option value="" />
            {(meta?.reviewers ?? []).map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="text-sm text-slate-700">Subcontractor
          <input list="add-submittal-subs" value={draft.subcontractor} onChange={(e) => set('subcontractor', e.target.value)} className={inputClass} />
          <datalist id="add-submittal-subs">
            {subcontractorOptions.map((option) => <option key={option} value={option} />)}
          </datalist>
        </label>
        <label className="text-sm text-slate-700">Rev
          <input type="number" min={0} value={draft.rev} onChange={(e) => set('rev', e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm text-slate-700">Status (action code)
          <select value={draft.action_code} onChange={(e) => set('action_code', e.target.value)} className={inputClass}>
            <option value="">— In review / not returned —</option>
            {(meta?.action_codes ?? []).map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Submission dates (drive ball in court, days and alerts)</p>
      <div className="mt-2 grid gap-3 md:grid-cols-4">
        {dateInput('received_from_sub', 'Received from sub')}
        {dateInput('date_sent', 'Sent to reviewer')}
        {dateInput('returned_by_reviewer', 'Returned by reviewer')}
        {dateInput('returned_to_sub', 'Returned to sub')}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Schedule (drives submit by)</p>
      <div className="mt-2 grid gap-3 md:grid-cols-4">
        <label className="text-sm text-slate-700">Lead time (weeks)
          <input type="number" min={0} value={draft.lead_time_weeks} onChange={(e) => set('lead_time_weeks', e.target.value)} className={inputClass} />
        </label>
        {dateInput('needed_on_site', 'Needed on site')}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Will show as</span>
        <span>Status <StatusBadge label={preview.status} tone={statusTone(preview.status)} /></span>
        <span>Ball in court <StatusBadge label={preview.ball} tone={ballTone(preview.ball)} /></span>
        <span>Days {preview.days ?? '—'}</span>
        <span>Submit by {formatDate(preview.submitBy) || '—'}</span>
        <span>Alert {preview.alert ? <StatusBadge label={preview.alert} tone={alertTone(preview.alert)} /> : '—'}</span>
      </div>

      <div className="mt-3 flex gap-2">
        <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save submittal'}</PrimaryButton>
        <PrimaryButton type="button" variant="secondary" onClick={onCancel}>Cancel</PrimaryButton>
      </div>
    </form>
  )
}
