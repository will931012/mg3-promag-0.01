import type { EorType } from '../app/eorTypes'

export type DashboardSummary = {
  active_projects: number
  submittals_open: number
  submittals_late: number
  rfis_open: number
  rfis_overdue_open: number
}

export type ProjectRecord = {
  project_id: string
  project_name: string
  address: string | null
  image_url: string | null
  developer: string | null
  aor: string | null
  eor: string | null
  end_date: string | null
  status: string | null
  priority: string | null
  notes: string | null
}

export type AorRecord = {
  id: number
  name: string
}

export type EorRecord = {
  id: number
  type: EorType
  name: string
}

export type SubcontractorRecord = {
  id: number
  name: string
}

export type SubmittalRecord = {
  id: number
  project_id: string | null
  division_csi: string | null
  submittal_number: string | null
  subject: string | null
  contractor: string | null
  date_received: string | null
  sent_to_aor: string | null
  sent_to_eor: string | null
  sent_to_subcontractor: string | null
  sent_to_date: string | null
  approvers: string | null
  approval_status: string | null
  lifecycle_status: string | null
  revision: string | null
  due_date: string | null
  days_pending: number | null
  overall_status: string | null
  responsible: string | null
  workflow_stage: string | null
  notes: string | null
}

export type RfiRecord = {
  id: number
  project_id: string | null
  rfi_number: string | null
  subject: string | null
  description: string | null
  from_contractor: string | null
  date_sent: string | null
  sent_to_aor: string | null
  sent_to_eor: string | null
  sent_to_subcontractor: string | null
  sent_to_date: string | null
  response_due: string | null
  date_answered: string | null
  status: string | null
  lifecycle_status: string | null
  days_open: number | null
  responsible: string | null
  notes: string | null
}
