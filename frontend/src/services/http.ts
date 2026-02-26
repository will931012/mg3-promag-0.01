import { API_BASE } from '../app/config'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  token?: string
  body?: unknown
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<{ ok: boolean; status: number; data: T | null }> {
  const headers: Record<string, string> = {}

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (options.token) {
    headers.Authorization = `Token ${options.token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  let data: T | null = null
  try {
    data = (await response.json()) as T
  } catch {
    data = null
  }

  return { ok: response.ok, status: response.status, data }
}
