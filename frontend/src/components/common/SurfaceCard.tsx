import type { ReactNode } from 'react'

type SurfaceCardProps = {
  children: ReactNode
  className?: string
}

export default function SurfaceCard({ children, className = '' }: SurfaceCardProps) {
  return <article className={`ui-surface-card ${className}`.trim()}>{children}</article>
}

