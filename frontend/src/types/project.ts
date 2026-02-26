export type ProjectStatus = 'planning' | 'active' | 'at_risk' | 'done'

export type Project = {
  id: number
  name: string
  location: string
  client: string
  budget: string
  start_date: string
  end_date: string
  progress: number
  status: ProjectStatus
}
