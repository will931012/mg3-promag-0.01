// Shop drawing register: one row per submittal per project, plus a log of every submission (Rev 0, Rev 1…).

export type RegisterMeta = {
  default_review_days: number
  reviewers: string[]
  action_codes: string[]
  disciplines: string[]
  submittal_types: string[]
  trades: string[]
  alerts: string[]
}

export type RegisterItemFields = {
  submittal_no: string
  spec_section: string
  description: string
  discipline: string
  submittal_type: string
  reviewer: string
  ahj: string
  signed_sealed: boolean
  long_lead: boolean
  inspection_related: boolean
  notes: string
}

export type ProjectItemFields = RegisterItemFields & {
  in_use: boolean
  subcontractor: string
  lead_time_weeks: number | null
  needed_on_site: string | null
  sent_to_ahj: string | null
  ahj_approved: string | null
}

export type LogEntryFields = {
  rev: number
  received_from_sub: string | null
  sent_to: string
  date_sent: string | null
  returned_by_reviewer: string | null
  action_code: string
  returned_to_sub: string | null
  gc_transmittal_no: string
  comments: string
}

export type LogEntry = LogEntryFields & {
  id: number
  register_item_id: number
  // Calculated
  review_due: string | null
  days_in_review: number | null
  ball_in_court: string
  days_with_ball: number | null
  alert: string
}

export type RegisterItem = ProjectItemFields & {
  id: number
  project_id: string
  project_name: string
  master_item_id: number | null
  // Calculated (empty when the item is not in use)
  submit_by: string | null
  submissions: number | null
  latest_rev: number | null
  current_status: string
  ball_in_court: string
  days_with_ball: number | null
  design_approved: string | null
  alert: string
  log: LogEntry[]
}

export type ProjectRegister = {
  project: { project_id: string; project_name: string; review_days: number }
  items: RegisterItem[]
}

export type RegisterActivityItem = {
  id: number
  project_id: string
  project_name: string
  submittal_no: string
  description: string
  discipline: string
  current_status: string
  ball_in_court: string
  days_with_ball: number | null
  alert: string
  latest_rev: number | null
  review_due: string | null
  submit_by: string | null
}

export type RegisterActivity = {
  submittals_open: number
  submittals_late: number
  alerts: number
  items: RegisterActivityItem[]
  attention: RegisterActivityItem[]
}

export type MasterItem = RegisterItemFields & {
  id: number
  seen_on: string
  is_active: boolean
  updated_at: string
}
