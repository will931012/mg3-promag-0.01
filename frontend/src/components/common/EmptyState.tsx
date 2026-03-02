import PrimaryButton from './PrimaryButton'

type EmptyStateProps = {
  title: string
  description: string
  ctaLabel?: string
  onCta?: () => void
}

export default function EmptyState({ title, description, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      {ctaLabel && onCta ? (
        <PrimaryButton type="button" onClick={onCta} className="mt-3">
          {ctaLabel}
        </PrimaryButton>
      ) : null}
    </div>
  )
}

