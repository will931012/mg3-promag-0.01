export const EOR_TYPES = ['Civil EOR', 'Structural EOR', 'MEP EOR'] as const

export type EorType = (typeof EOR_TYPES)[number]
