export const toNullableString = (value: string | null | undefined) => {
  const trimmed = String(value ?? '').trim()
  return trimmed.length ? trimmed : null
}

export const toNullableNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
