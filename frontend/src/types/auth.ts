export type AuthUser = {
  id: number
  username: string
  email: string
  full_name?: string
}

export type LoginResponse = {
  token: string
  user: AuthUser
}

export type MeResponse = {
  user: AuthUser
}
