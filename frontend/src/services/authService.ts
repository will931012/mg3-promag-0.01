import type { LoginResponse, MeResponse } from '../types/auth'
import { requestJson } from './http'

export async function getHealth(): Promise<string> {
  const res = await requestJson<{ status?: string }>('/health/')
  return res.data?.status ?? 'offline'
}

export async function login(username: string, password: string) {
  return requestJson<LoginResponse | { detail?: string }>('/auth/login/', {
    method: 'POST',
    body: { username, password },
  })
}

export async function getCurrentUser(token: string) {
  return requestJson<MeResponse>('/auth/me/', { token })
}

export async function logout(token: string) {
  return requestJson<{ detail?: string }>('/auth/logout/', {
    method: 'POST',
    token,
  })
}
