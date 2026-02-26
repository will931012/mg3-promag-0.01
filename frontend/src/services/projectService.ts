import type { Project } from '../types/project'
import { requestJson } from './http'

export async function getProjects(token: string): Promise<Project[]> {
  const res = await requestJson<Project[]>('/projects/', { token })
  if (!res.ok || !Array.isArray(res.data)) {
    return []
  }
  return res.data
}
