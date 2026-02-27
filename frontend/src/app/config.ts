const rawApiBase = import.meta.env.VITE_API_BASE?.trim()

export const API_BASE = (rawApiBase && rawApiBase.length > 0 ? rawApiBase : 'http://127.0.0.1:4000/api').replace(/\/+$/, '')
export const TOKEN_KEY = 'promag_token'
