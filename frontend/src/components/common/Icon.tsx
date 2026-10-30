// Small line icons (24×24, drawn with currentColor) for navigation and toolbar buttons.

export type IconName =
  | 'dashboard'
  | 'projects'
  | 'submittals'
  | 'rfis'
  | 'contacts'
  | 'users'
  | 'master'
  | 'search'
  | 'sun'
  | 'moon'
  | 'menu'
  | 'close'
  | 'collapse'
  | 'expand'
  | 'logout'
  | 'recent'

const PATHS: Record<IconName, string[]> = {
  dashboard: ['M4 4h7v7H4z', 'M13 4h7v4h-7z', 'M13 10h7v10h-7z', 'M4 13h7v7H4z'],
  projects: ['M4 21V7l8-4 8 4v14', 'M9 21v-5h6v5', 'M8 10h2', 'M14 10h2', 'M8 13h2', 'M14 13h2', 'M3 21h18'],
  submittals: ['M9 4h6v3H9z', 'M8 5.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-2', 'm9 14 2 2 4-4'],
  rfis: ['M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.8A8 8 0 1 1 21 12z', 'M10 9.5a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2v.5', 'M12 15.5h.01'],
  contacts: ['M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M12 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'M8 17c.7-1.8 2.2-3 4-3s3.3 1.2 4 3', 'M3 7h2', 'M3 12h2', 'M3 17h2'],
  users: ['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5', 'M16 4.5a3.5 3.5 0 0 1 0 6.5', 'M18 14.8c1.8.7 3 2.5 3.5 5.2'],
  master: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'm20 20-3.5-3.5'],
  sun: ['M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 2v2', 'M12 20v2', 'm4.9 4.9 1.4 1.4', 'm17.7 17.7 1.4 1.4', 'M2 12h2', 'M20 12h2', 'm4.9 19.1 1.4-1.4', 'm17.7 6.3 1.4-1.4'],
  moon: ['M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  close: ['m6 6 12 12', 'M18 6 6 18'],
  collapse: ['M4 4h16v16H4z', 'M9 4v16', 'm15 9-3 3 3 3'],
  expand: ['M4 4h16v16H4z', 'M9 4v16', 'm13 9 3 3-3 3'],
  logout: ['M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3', 'M10 17l5-5-5-5', 'M15 12H4'],
  recent: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
}

type IconProps = {
  name: IconName
  className?: string
}

export default function Icon({ name, className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
