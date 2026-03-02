import type { ReactNode } from 'react'

type BreadcrumbItem = {
  label: string
  onClick?: () => void
}

type BreadcrumbsProps = {
  items: BreadcrumbItem[]
  rightSlot?: ReactNode
}

export default function Breadcrumbs({ items, rightSlot }: BreadcrumbsProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex flex-wrap items-center gap-1 text-sm text-slate-600">
        {items.map((item, index) => (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1">
            {item.onClick ? (
              <button type="button" onClick={item.onClick} className="rounded px-1 text-brand-700 hover:bg-brand-50 hover:underline">
                {item.label}
              </button>
            ) : (
              <span className="px-1 font-semibold text-slate-800">{item.label}</span>
            )}
            {index < items.length - 1 ? <span className="text-slate-400">/</span> : null}
          </span>
        ))}
      </div>
      {rightSlot ? <div>{rightSlot}</div> : null}
    </div>
  )
}

