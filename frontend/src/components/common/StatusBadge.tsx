type StatusBadgeProps = {
  label: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}

export default function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const toneClass =
    tone === 'success'
      ? 'ui-badge-success'
      : tone === 'warning'
        ? 'ui-badge-warning'
        : tone === 'danger'
          ? 'ui-badge-danger'
          : tone === 'info'
            ? 'ui-badge-info'
            : 'ui-badge-neutral'
  return <span className={`ui-badge ${toneClass}`}>{label}</span>
}

