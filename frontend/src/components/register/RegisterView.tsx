import { useEffect, useMemo, useState } from 'react'

import EmptyState from '../common/EmptyState'
import PrimaryButton from '../common/PrimaryButton'
import StatusBadge from '../common/StatusBadge'
import RegisterItemDetail from './RegisterItemDetail'
import AddSubmittalForm from './AddSubmittalForm'
import { alertTone, ballTone, formatDate, statusTone } from './registerUi'
import { downloadCsv } from '../../app/tableUtils'
import {
  fetchProjectRegister,
  fetchRegisterMeta,
  responseDetail,
  updateRegisterItem,
  updateReviewDays,
} from '../../services/registerService'
import type { ProjectRegister, RegisterItem, RegisterMeta } from '../../types/register'

type RegisterViewProps = {
  token: string
  projectId: string
  selectedItemId: number | null
  onOpenItem: (itemId: number | null) => void
  setMessage: (message: string) => void
  onChanged: () => void
}

// 'submitted' = the submittals already logged on this project (the default view).
type UsageFilter = 'submitted' | 'in_use' | 'not_used' | 'all'
type BallFilter = '' | 'Subcontractor' | 'GC' | 'reviewer' | 'Closed'

const FIXED_BALLS = new Set(['Subcontractor', 'GC', 'Closed', 'Superseded', ''])


export default function RegisterView({ token, projectId, selectedItemId, onOpenItem, setMessage, onChanged }: RegisterViewProps) {
  const [register, setRegister] = useState<ProjectRegister | null>(null)
  const [meta, setMeta] = useState<RegisterMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [usage, setUsage] = useState<UsageFilter>('submitted')
  const [search, setSearch] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [ball, setBall] = useState<BallFilter>('')
  const [status, setStatus] = useState('')
  const [alertsOnly, setAlertsOnly] = useState(false)
  const [reviewDaysInput, setReviewDaysInput] = useState('')
  const [showNewItem, setShowNewItem] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchRegisterMeta(token).then((res) => {
      if (!cancelled && res.ok && res.data) setMeta(res.data)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    void fetchProjectRegister(token, projectId).then((res) => {
      if (cancelled) return
      if (res.ok && res.data) {
        setRegister(res.data)
        setReviewDaysInput(String(res.data.project.review_days))
      } else {
        setRegister(null)
        setLoadError(responseDetail(res.data, 'Unable to load the register for this project.'))
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [token, projectId])

  const items = register?.items ?? []
  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId])

  const counts = useMemo(() => {
    const inUse = items.filter((item) => item.in_use)
    return {
      inUse: inUse.length,
      notUsed: items.length - inUse.length,
      notSubmitted: inUse.filter((item) => item.submissions === 0).length,
      open: inUse.filter((item) => (item.submissions ?? 0) > 0 && item.ball_in_court !== 'Closed').length,
      closed: inUse.filter((item) => item.ball_in_court === 'Closed').length,
      alerts: inUse.filter((item) => item.alert).length,
    }
  }, [items])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter((item) => {
      if (usage === 'submitted' && !(item.in_use && (item.submissions ?? 0) > 0)) return false
      if (usage === 'in_use' && !item.in_use) return false
      if (usage === 'not_used' && item.in_use) return false
      if (discipline && item.discipline !== discipline) return false
      if (status && item.current_status !== status) return false
      if (alertsOnly && !item.alert) return false
      if (ball === 'reviewer' && FIXED_BALLS.has(item.ball_in_court)) return false
      if (ball && ball !== 'reviewer' && item.ball_in_court !== ball) return false
      if (!query) return true
      return `${item.submittal_no} ${item.spec_section} ${item.description} ${item.subcontractor} ${item.notes}`.toLowerCase().includes(query)
    })
  }, [items, usage, discipline, status, alertsOnly, ball, search])

  const replaceItem = (updated: RegisterItem) => {
    setRegister((prev) => (prev ? { ...prev, items: prev.items.map((item) => (item.id === updated.id ? updated : item)) } : prev))
    onChanged()
  }

  const removeItem = (itemId: number) => {
    setRegister((prev) => (prev ? { ...prev, items: prev.items.filter((item) => item.id !== itemId) } : prev))
    onChanged()
  }

  const toggleInUse = async (item: RegisterItem) => {
    setTogglingId(item.id)
    const res = await updateRegisterItem(token, item.id, { in_use: !item.in_use })
    setTogglingId(null)
    if (res.ok && res.data) replaceItem(res.data)
    else setMessage(responseDetail(res.data, 'Failed to update item.'))
  }

  const saveReviewDays = async () => {
    const value = Number(reviewDaysInput)
    if (!Number.isInteger(value) || value < 0) return setMessage('Review period must be a whole number of days.')
    const res = await updateReviewDays(token, projectId, value)
    if (!res.ok) return setMessage(responseDetail(res.data, 'Failed to update review period.'))
    // Every due date depends on the review period, so reload the register.
    const reloaded = await fetchProjectRegister(token, projectId)
    if (reloaded.ok && reloaded.data) setRegister(reloaded.data)
    onChanged()
    setMessage(`Review period set to ${value} days.`)
  }

  const handleSubmittalSaved = (saved: RegisterItem, isNew: boolean) => {
    if (isNew) {
      setRegister((prev) =>
        prev
          ? { ...prev, items: [...prev.items, saved].sort((a, b) => a.submittal_no.localeCompare(b.submittal_no, undefined, { numeric: true })) }
          : prev
      )
      onChanged()
    } else {
      replaceItem(saved)
    }
    setShowNewItem(false)
    // Make sure the saved row is visible: not-yet-submitted items aren't in the "Submitted" view.
    if (!saved.submissions && usage === 'submitted') setUsage('in_use')
  }

  const exportCsv = () => {
    const headers = [
      'Used', 'Submittal No.', 'Spec section', 'Description', 'Discipline', 'Type', 'Reviewer', 'AHJ', 'Signed & sealed', 'Long lead',
      'Subcontractor', 'Lead time (weeks)', 'Needed on site', 'Submit by', 'No. of submissions', 'Latest rev', 'Current status',
      'Ball in court', 'Days with ball', 'Design team approved', 'Sent to AHJ', 'AHJ approved', 'Alert', 'Notes',
    ]
    const rows = filteredItems.map((item) => [
      item.in_use ? 'Y' : 'N', item.submittal_no, item.spec_section, item.description, item.discipline, item.submittal_type,
      item.reviewer, item.ahj, item.signed_sealed ? 'Y' : 'N', item.long_lead ? 'Y' : 'N', item.subcontractor,
      item.lead_time_weeks ?? '', item.needed_on_site ?? '', item.submit_by ?? '', item.submissions ?? '', item.latest_rev ?? '',
      item.current_status, item.ball_in_court, item.days_with_ball ?? '', item.design_approved ?? '', item.sent_to_ahj ?? '',
      item.ahj_approved ?? '', item.alert, item.notes,
    ])
    downloadCsv(`${projectId}-shop-drawing-register.csv`, headers, rows)
  }

  if (loading) return <p className="mt-4 text-sm text-slate-600">Loading register…</p>
  if (loadError || !register) return <div className="mt-4"><EmptyState title="Register unavailable" description={loadError} /></div>

  if (selectedItemId !== null) {
    if (!selectedItem) {
      return (
        <div className="mt-4">
          <EmptyState title="Item not found" description="It may have been removed from this project." ctaLabel="Back to register" onCta={() => onOpenItem(null)} />
        </div>
      )
    }
    return (
      <RegisterItemDetail
        token={token}
        item={selectedItem}
        meta={meta}
        reviewDays={register.project.review_days}
        onBack={() => onOpenItem(null)}
        onItemChanged={replaceItem}
        onItemDeleted={(itemId) => {
          removeItem(itemId)
          onOpenItem(null)
        }}
        setMessage={setMessage}
      />
    )
  }

  const statusOptions = ['Not submitted', 'In review', ...(meta?.action_codes ?? [])]
  const selectClass = 'w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-900'
  const submittedCount = counts.inUse - counts.notSubmitted
  const clearFilters = () => {
    setSearch('')
    setDiscipline('')
    setStatus('')
    setBall('')
    setAlertsOnly(false)
    setUsage('submitted')
  }

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* Tools: search, add, filters, export */}
      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start" aria-label="Register tools">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Tools</p>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search number, description, sub"
          aria-label="Search register"
          className={selectClass}
        />
        <PrimaryButton type="button" className="w-full" onClick={() => setShowNewItem((prev) => !prev)}>
          {showNewItem ? 'Cancel new submittal' : '+ Add submittal'}
        </PrimaryButton>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-surface p-3">
          <p className="text-xs font-semibold text-slate-600">Show</p>
          <select value={usage} onChange={(event) => setUsage(event.target.value as UsageFilter)} aria-label="Show" className={selectClass}>
            <option value="submitted">Submitted ({submittedCount})</option>
            <option value="in_use">All used on this project ({counts.inUse})</option>
            <option value="not_used">Not used ({counts.notUsed})</option>
            <option value="all">Everything ({items.length})</option>
          </select>
          <select value={discipline} onChange={(event) => setDiscipline(event.target.value)} aria-label="Discipline" className={selectClass}>
            <option value="">All disciplines</option>
            {(meta?.disciplines ?? []).map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status" className={selectClass}>
            <option value="">All statuses</option>
            {statusOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={ball} onChange={(event) => setBall(event.target.value as BallFilter)} aria-label="Ball in court" className={selectClass}>
            <option value="">Ball: anyone</option>
            <option value="Subcontractor">Ball: subcontractor</option>
            <option value="GC">Ball: GC</option>
            <option value="reviewer">Ball: reviewer</option>
            <option value="Closed">Closed</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={alertsOnly} onChange={(event) => setAlertsOnly(event.target.checked)} />
            Alerts only
          </label>
          <button type="button" onClick={clearFilters} className="text-xs font-semibold text-brand-700 hover:underline">Reset filters</button>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-surface p-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Review period
            <input
              value={reviewDaysInput}
              onChange={(event) => setReviewDaysInput(event.target.value)}
              inputMode="numeric"
              aria-label="Review period in calendar days"
              className="w-14 rounded-lg border border-slate-300 bg-surface px-2 py-1 text-sm text-slate-900"
            />
            days
          </label>
          {reviewDaysInput !== String(register.project.review_days) ? (
            <PrimaryButton type="button" variant="secondary" className="w-full" onClick={() => void saveReviewDays()}>Save review period</PrimaryButton>
          ) : null}
          <PrimaryButton type="button" variant="secondary" className="w-full" onClick={exportCsv}>Export CSV</PrimaryButton>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {[
            ['Submitted', submittedCount, 'neutral'],
            ['Open', counts.open, 'info'],
            ['Closed', counts.closed, 'success'],
            ['Alerts', counts.alerts, counts.alerts ? 'danger' : 'neutral'],
            ['Not submitted yet', counts.notSubmitted, 'neutral'],
          ].map(([label, value, tone]) => (
            <div key={String(label)} className="rounded-xl border border-slate-200 bg-surface p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
              <p className={`mt-1 text-2xl font-semibold ${tone === 'danger' ? 'text-rose-700' : tone === 'success' ? 'text-emerald-700' : tone === 'info' ? 'text-sky-700' : 'text-slate-900'}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {showNewItem ? (
          <AddSubmittalForm
            token={token}
            projectId={projectId}
            items={items}
            meta={meta}
            reviewDays={register.project.review_days}
            onSaved={handleSubmittalSaved}
            onCancel={() => setShowNewItem(false)}
            setMessage={setMessage}
          />
        ) : null}

        <p className="mt-3 text-sm text-slate-600">
          Showing {filteredItems.length} of {items.length} items.
          {usage === 'submitted'
            ? ' Use + Add submittal to log a new one; type its description to pick it from the master list.'
            : ' Untick an item that doesn’t apply to this project instead of deleting it.'}
        </p>

        <div className="ui-scroll mt-2 overflow-x-auto">
          <table className="ui-table min-w-[1200px]">
            <thead>
              <tr className="bg-slate-100">
                {['Used', 'Submittal No.', 'Description', 'Type', 'Reviewer', 'Subcontractor', 'Rev', 'Status', 'Ball in court', 'Days', 'Submit by', 'Alert'].map((header) => (
                  <th key={header} className="border px-3 py-2 text-left">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onOpenItem(item.id)}
                  className={`cursor-pointer hover:bg-slate-50 ${item.in_use ? '' : 'text-slate-400'}`}
                >
                  <td className="border px-3 py-2 text-center" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={item.in_use}
                      disabled={togglingId === item.id}
                      onChange={() => void toggleInUse(item)}
                      aria-label={`Use ${item.submittal_no} on this project`}
                    />
                  </td>
                  <td className="whitespace-nowrap border px-3 py-2 font-medium">{item.submittal_no}</td>
                  <td className="border px-3 py-2">
                    <span>{item.description}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {[item.discipline, item.ahj && `AHJ: ${item.ahj}`, item.long_lead && 'Long lead', item.master_item_id ? null : 'Project item'].filter(Boolean).join(' · ')}
                    </span>
                  </td>
                  <td className="border px-3 py-2 text-sm">{item.submittal_type}</td>
                  <td className="border px-3 py-2 text-sm">{item.reviewer}</td>
                  <td className="border px-3 py-2 text-sm">{item.subcontractor}</td>
                  <td className="border px-3 py-2 text-center">{item.latest_rev ?? ''}</td>
                  <td className="whitespace-nowrap border px-3 py-2">{item.current_status ? <StatusBadge label={item.current_status} tone={statusTone(item.current_status)} /> : null}</td>
                  <td className="whitespace-nowrap border px-3 py-2">{item.ball_in_court ? <StatusBadge label={item.ball_in_court} tone={ballTone(item.ball_in_court)} /> : null}</td>
                  <td className="border px-3 py-2 text-center">{item.days_with_ball ?? ''}</td>
                  <td className="whitespace-nowrap border px-3 py-2 text-sm">{formatDate(item.submit_by)}</td>
                  <td className="whitespace-nowrap border px-3 py-2">{item.alert ? <StatusBadge label={item.alert} tone={alertTone(item.alert)} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredItems.length === 0 ? (
          <div className="mt-3">
            {usage === 'submitted' && !search && !discipline && !status && !ball && !alertsOnly ? (
              <EmptyState
                title="Nothing submitted yet"
                description="Use + Add submittal and type the description to pick it from the master list."
                ctaLabel="Show all items"
                onCta={() => setUsage('in_use')}
              />
            ) : (
              <EmptyState title="No items match your filters" description="Try clearing the search or filters." ctaLabel="Reset filters" onCta={clearFilters} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
