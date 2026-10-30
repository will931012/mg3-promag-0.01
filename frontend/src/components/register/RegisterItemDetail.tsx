import { useEffect, useMemo, useState } from 'react'

import PrimaryButton from '../common/PrimaryButton'
import StatusBadge from '../common/StatusBadge'
import { alertTone, ballTone, formatDate, inputClass, statusTone } from './registerUi'
import { createLogEntry, deleteLogEntry, deleteRegisterItem, responseDetail, updateLogEntry, updateRegisterItem } from '../../services/registerService'
import { fetchSubcontractors } from '../../services/workspaceService'
import type { LogEntry, LogEntryFields, ProjectItemFields, RegisterItem, RegisterMeta } from '../../types/register'

type RegisterItemDetailProps = {
  token: string
  item: RegisterItem
  meta: RegisterMeta | null
  reviewDays: number
  onBack: () => void
  onItemChanged: (item: RegisterItem) => void
  onItemDeleted: (itemId: number) => void
  setMessage: (message: string) => void
}

const ITEM_FIELDS: Array<keyof ProjectItemFields> = [
  'submittal_no', 'spec_section', 'description', 'discipline', 'submittal_type', 'reviewer', 'ahj', 'signed_sealed', 'long_lead',
  'inspection_related', 'notes', 'in_use', 'subcontractor', 'lead_time_weeks', 'needed_on_site', 'sent_to_ahj', 'ahj_approved',
]

const pickItemFields = (item: RegisterItem): ProjectItemFields =>
  Object.fromEntries(ITEM_FIELDS.map((field) => [field, item[field]])) as ProjectItemFields

const pickLogFields = (entry: LogEntry): LogEntryFields => ({
  rev: entry.rev,
  received_from_sub: entry.received_from_sub,
  sent_to: entry.sent_to,
  date_sent: entry.date_sent,
  returned_by_reviewer: entry.returned_by_reviewer,
  action_code: entry.action_code,
  returned_to_sub: entry.returned_to_sub,
  gc_transmittal_no: entry.gc_transmittal_no,
  comments: entry.comments,
})

const orNull = (value: string) => (value ? value : null)

export default function RegisterItemDetail({
  token,
  item,
  meta,
  reviewDays,
  onBack,
  onItemChanged,
  onItemDeleted,
  setMessage,
}: RegisterItemDetailProps) {
  const [draft, setDraft] = useState<ProjectItemFields>(() => pickItemFields(item))
  const [savingItem, setSavingItem] = useState(false)
  const [subcontractorNames, setSubcontractorNames] = useState<string[]>([])
  const [editingLogId, setEditingLogId] = useState<number | 'new' | null>(null)
  const [logDraft, setLogDraft] = useState<LogEntryFields | null>(null)
  const [savingLog, setSavingLog] = useState(false)

  useEffect(() => {
    setDraft(pickItemFields(item))
  }, [item])

  useEffect(() => {
    void fetchSubcontractors(token).then((records) => setSubcontractorNames(records.map((record) => record.name)))
  }, [token])

  const changedFields = useMemo(() => {
    const original = pickItemFields(item)
    return ITEM_FIELDS.filter((field) => draft[field] !== original[field])
  }, [draft, item])
  const isDirty = changedFields.length > 0 || editingLogId !== null

  const setField = <K extends keyof ProjectItemFields>(field: K, value: ProjectItemFields[K]) => setDraft((prev) => ({ ...prev, [field]: value }))

  const saveItem = async () => {
    setSavingItem(true)
    const payload = Object.fromEntries(changedFields.map((field) => [field, draft[field]]))
    const res = await updateRegisterItem(token, item.id, payload)
    setSavingItem(false)
    if (!res.ok || !res.data) return setMessage(responseDetail(res.data, 'Failed to save item.'))
    onItemChanged(res.data)
    setMessage(`Saved ${res.data.submittal_no}.`)
  }

  const deleteItem = async () => {
    if (!confirm(`Delete ${item.submittal_no} from this project?`)) return
    const res = await deleteRegisterItem(token, item.id)
    if (!res.ok) return setMessage(responseDetail(res.data, 'Failed to delete item.'))
    onItemDeleted(item.id)
    setMessage(`Deleted ${item.submittal_no}.`)
  }

  const startNewSubmission = () => {
    const nextRev = item.log.length ? Math.max(...item.log.map((entry) => entry.rev)) + 1 : 0
    setLogDraft({
      rev: nextRev,
      received_from_sub: null,
      sent_to: item.reviewer,
      date_sent: null,
      returned_by_reviewer: null,
      action_code: '',
      returned_to_sub: null,
      gc_transmittal_no: '',
      comments: '',
    })
    setEditingLogId('new')
  }

  const startEditLog = (entry: LogEntry) => {
    setLogDraft(pickLogFields(entry))
    setEditingLogId(entry.id)
  }

  const cancelLogEdit = () => {
    setLogDraft(null)
    setEditingLogId(null)
  }

  const saveLog = async () => {
    if (!logDraft || editingLogId === null) return
    setSavingLog(true)
    const res = editingLogId === 'new' ? await createLogEntry(token, item.id, logDraft) : await updateLogEntry(token, editingLogId, logDraft)
    setSavingLog(false)
    if (!res.ok || !res.data) return setMessage(responseDetail(res.data, 'Failed to save submission.'))
    onItemChanged(res.data)
    cancelLogEdit()
    setMessage(`Saved Rev ${logDraft.rev} of ${item.submittal_no}.`)
  }

  const removeLog = async (entry: LogEntry) => {
    if (!confirm(`Delete Rev ${entry.rev} of ${item.submittal_no}?`)) return
    const res = await deleteLogEntry(token, entry.id)
    if (!res.ok || !res.data) return setMessage(responseDetail(res.data, 'Failed to delete submission.'))
    onItemChanged(res.data)
    setMessage(`Deleted Rev ${entry.rev}.`)
  }

  const reviewers = Array.from(new Set([...(meta?.reviewers ?? []), item.reviewer, logDraft?.sent_to ?? ''].filter(Boolean)))
  const canDelete = !item.master_item_id && item.log.length === 0

  const renderLogEditor = () => {
    if (!logDraft) return null
    const setLog = <K extends keyof LogEntryFields>(field: K, value: LogEntryFields[K]) => setLogDraft((prev) => (prev ? { ...prev, [field]: value } : prev))
    return (
      <div className="rounded-xl border border-brand-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm text-slate-700">Rev
            <input type="number" min={0} value={logDraft.rev} onChange={(e) => setLog('rev', Number(e.target.value))} className={inputClass} />
          </label>
          <label className="text-sm text-slate-700">GC transmittal No.
            <input value={logDraft.gc_transmittal_no} onChange={(e) => setLog('gc_transmittal_no', e.target.value)} className={inputClass} />
          </label>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="text-sm text-slate-700">1. Received from subcontractor
            <input type="date" value={logDraft.received_from_sub ?? ''} onChange={(e) => setLog('received_from_sub', orNull(e.target.value))} className={inputClass} />
          </label>
          <div className="grid gap-2">
            <label className="text-sm text-slate-700">2. Sent to reviewer
              <select value={logDraft.sent_to} onChange={(e) => setLog('sent_to', e.target.value)} className={inputClass}>
                <option value="" />
                {reviewers.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-700">Date sent
              <input type="date" value={logDraft.date_sent ?? ''} onChange={(e) => setLog('date_sent', orNull(e.target.value))} className={inputClass} />
            </label>
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-slate-700">3. Returned by reviewer
              <input type="date" value={logDraft.returned_by_reviewer ?? ''} onChange={(e) => setLog('returned_by_reviewer', orNull(e.target.value))} className={inputClass} />
            </label>
            <label className="text-sm text-slate-700">Action code
              <select value={logDraft.action_code} onChange={(e) => setLog('action_code', e.target.value)} className={inputClass}>
                <option value="" />
                {(meta?.action_codes ?? []).map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>
          <label className="text-sm text-slate-700">4. Returned to subcontractor
            <input type="date" value={logDraft.returned_to_sub ?? ''} onChange={(e) => setLog('returned_to_sub', orNull(e.target.value))} className={inputClass} />
          </label>
        </div>
        <label className="mt-3 block text-sm text-slate-700">Comments / reviewer notes
          <textarea value={logDraft.comments} onChange={(e) => setLog('comments', e.target.value)} rows={3} className={inputClass} />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Leave a date blank until it happens. Review is due {reviewDays} calendar days after the date sent. Revise &amp; Resubmit or Rejected sends the ball back to the
          subcontractor; log the resubmission as the next Rev.
        </p>
        <div className="mt-3 flex gap-2">
          <PrimaryButton type="button" onClick={() => void saveLog()} disabled={savingLog}>{savingLog ? 'Saving…' : 'Save submission'}</PrimaryButton>
          <PrimaryButton type="button" variant="secondary" onClick={cancelLogEdit}>Cancel</PrimaryButton>
        </div>
      </div>
    )
  }

  return (
    <article className="detail-card mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{item.submittal_no}{item.master_item_id ? '' : ' · Project item'}</p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-900">{item.description}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {item.in_use ? null : <StatusBadge label="Not used on this project" />}
            {item.current_status ? <StatusBadge label={item.current_status} tone={statusTone(item.current_status)} /> : null}
            {item.ball_in_court ? <StatusBadge label={`Ball: ${item.ball_in_court}`} tone={ballTone(item.ball_in_court)} /> : null}
            {item.alert ? <StatusBadge label={item.alert} tone={alertTone(item.alert)} /> : null}
          </div>
        </div>
        <PrimaryButton
          type="button"
          variant="secondary"
          onClick={() => {
            if (isDirty && !confirm('You have unsaved changes. Leave anyway?')) return
            onBack()
          }}
        >
          Back to register
        </PrimaryButton>
      </div>

      {item.in_use ? (
        <dl className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['Submissions', item.submissions ?? 0],
            ['Latest rev', item.latest_rev ?? '—'],
            ['Days with ball', item.days_with_ball ?? '—'],
            ['Submit by', formatDate(item.submit_by) || '—'],
            ['Design team approved', formatDate(item.design_approved) || '—'],
            ['Review period', `${reviewDays} days`],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs uppercase tracking-[0.1em] text-slate-500">{label}</dt>
              <dd className="mt-1 text-base font-semibold text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <section className="mt-6">
        <h4 className="text-lg font-semibold text-slate-900">Item</h4>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-3">
            <input type="checkbox" checked={draft.in_use} onChange={(e) => setField('in_use', e.target.checked)} />
            Used on this project
          </label>
          <label className="text-sm text-slate-700">Subcontractor / supplier
            <input list="register-subcontractors" value={draft.subcontractor} onChange={(e) => setField('subcontractor', e.target.value)} className={inputClass} />
            <datalist id="register-subcontractors">
              {subcontractorNames.map((name) => <option key={name} value={name} />)}
            </datalist>
          </label>
          <label className="text-sm text-slate-700">Lead time (weeks)
            <input
              type="number"
              min={0}
              value={draft.lead_time_weeks ?? ''}
              onChange={(e) => setField('lead_time_weeks', e.target.value === '' ? null : Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className="text-sm text-slate-700">Needed on site
            <input type="date" value={draft.needed_on_site ?? ''} onChange={(e) => setField('needed_on_site', orNull(e.target.value))} className={inputClass} />
          </label>
          <label className="text-sm text-slate-700">AHJ / agency approval
            <input value={draft.ahj} onChange={(e) => setField('ahj', e.target.value)} placeholder="Blank if none" className={inputClass} />
          </label>
          <label className="text-sm text-slate-700">Sent to AHJ
            <input type="date" value={draft.sent_to_ahj ?? ''} onChange={(e) => setField('sent_to_ahj', orNull(e.target.value))} className={inputClass} />
          </label>
          <label className="text-sm text-slate-700">AHJ approved
            <input type="date" value={draft.ahj_approved ?? ''} onChange={(e) => setField('ahj_approved', orNull(e.target.value))} className={inputClass} />
          </label>
          <label className="text-sm text-slate-700">Submittal No.
            <input value={draft.submittal_no} onChange={(e) => setField('submittal_no', e.target.value)} className={inputClass} />
          </label>
          <label className="text-sm text-slate-700">Spec section
            <input value={draft.spec_section} onChange={(e) => setField('spec_section', e.target.value)} className={inputClass} />
          </label>
          <label className="text-sm text-slate-700">Description
            <input value={draft.description} onChange={(e) => setField('description', e.target.value)} className={inputClass} />
          </label>
          <label className="text-sm text-slate-700">Discipline
            <select value={draft.discipline} onChange={(e) => setField('discipline', e.target.value)} className={inputClass}>
              <option value="" />
              {Array.from(new Set([...(meta?.disciplines ?? []), draft.discipline].filter(Boolean))).map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-700">Type
            <select value={draft.submittal_type} onChange={(e) => setField('submittal_type', e.target.value)} className={inputClass}>
              <option value="" />
              {Array.from(new Set([...(meta?.submittal_types ?? []), draft.submittal_type].filter(Boolean))).map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-700">Reviewer
            <select value={draft.reviewer} onChange={(e) => setField('reviewer', e.target.value)} className={inputClass}>
              <option value="" />
              {Array.from(new Set([...(meta?.reviewers ?? []), draft.reviewer].filter(Boolean))).map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700 md:col-span-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.signed_sealed} onChange={(e) => setField('signed_sealed', e.target.checked)} />Signed &amp; sealed</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.long_lead} onChange={(e) => setField('long_lead', e.target.checked)} />Long lead</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.inspection_related} onChange={(e) => setField('inspection_related', e.target.checked)} />Inspection related</label>
          </div>
          <label className="text-sm text-slate-700 md:col-span-3">Notes
            <textarea value={draft.notes} onChange={(e) => setField('notes', e.target.value)} rows={2} className={inputClass} />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Long-lead items: Submit by = Needed on site − lead time − one review period. It assumes approval on the first try, so leave margin.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <PrimaryButton type="button" onClick={() => void saveItem()} disabled={!changedFields.length || savingItem}>
            {savingItem ? 'Saving…' : 'Save item'}
          </PrimaryButton>
          {changedFields.length ? (
            <PrimaryButton type="button" variant="secondary" onClick={() => setDraft(pickItemFields(item))}>Discard changes</PrimaryButton>
          ) : null}
          {canDelete ? <PrimaryButton type="button" variant="danger" onClick={() => void deleteItem()}>Delete item</PrimaryButton> : null}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-lg font-semibold text-slate-900">Submission log</h4>
          {editingLogId === null ? (
            <PrimaryButton type="button" onClick={startNewSubmission}>Log new submission</PrimaryButton>
          ) : null}
        </div>
        <div className="mt-3 space-y-3">
          {editingLogId === 'new' ? renderLogEditor() : null}
          {item.log.length === 0 && editingLogId !== 'new' ? (
            <p className="text-sm text-slate-600">Nothing submitted yet. When the subcontractor sends it in, log it as Rev 0.</p>
          ) : null}
          {item.log.map((entry) =>
            editingLogId === entry.id ? (
              <div key={entry.id}>{renderLogEditor()}</div>
            ) : (
              <div key={entry.id} className={`rounded-xl border p-4 ${entry.ball_in_court === 'Superseded' ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-200 bg-white'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-slate-900">Rev {entry.rev}</span>
                    {entry.action_code ? <StatusBadge label={entry.action_code} tone={statusTone(entry.action_code)} /> : null}
                    <StatusBadge
                      label={entry.days_with_ball !== null ? `Ball: ${entry.ball_in_court} · ${entry.days_with_ball} days` : entry.ball_in_court}
                      tone={ballTone(entry.ball_in_court)}
                    />
                    {entry.alert ? <StatusBadge label={entry.alert} tone={alertTone(entry.alert)} /> : null}
                    {entry.gc_transmittal_no ? <span className="text-xs text-slate-500">Transmittal {entry.gc_transmittal_no}</span> : null}
                  </div>
                  {editingLogId === null ? (
                    <div className="flex gap-2">
                      <PrimaryButton type="button" variant="secondary" onClick={() => startEditLog(entry)}>Edit</PrimaryButton>
                      <PrimaryButton type="button" variant="danger" onClick={() => void removeLog(entry)}>Delete</PrimaryButton>
                    </div>
                  ) : null}
                </div>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><dt className="text-xs text-slate-500">Received from sub</dt><dd>{formatDate(entry.received_from_sub) || '—'}</dd></div>
                  <div>
                    <dt className="text-xs text-slate-500">Sent to {entry.sent_to || 'reviewer'}</dt>
                    <dd>{formatDate(entry.date_sent) || '—'}{entry.review_due ? <span className="text-slate-500"> · due {formatDate(entry.review_due)}</span> : null}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Returned by reviewer</dt>
                    <dd>
                      {formatDate(entry.returned_by_reviewer) || '—'}
                      {entry.days_in_review !== null && (entry.returned_by_reviewer || entry.ball_in_court !== 'Superseded') ? (
                        <span className="text-slate-500"> · {entry.days_in_review} days {entry.returned_by_reviewer ? 'in review' : 'so far'}</span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Returned to sub</dt>
                    <dd>{formatDate(entry.returned_to_sub) || '—'}</dd>
                  </div>
                </dl>
                {entry.comments ? <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{entry.comments}</p> : null}
              </div>
            )
          )}
        </div>
      </section>
    </article>
  )
}
