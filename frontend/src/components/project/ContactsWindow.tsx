import { useEffect, useRef, useState } from 'react'

import Icon from '../common/Icon'
import ContactsAgenda from './ContactsAgenda'
import ProjectContacts from './ProjectContacts'

type ContactsWindowProps = {
  token: string
  projectId: string
  projectName: string
  setMessage: (message: string) => void
  onClose: () => void
}

type View = 'agenda' | 'sheet'

/**
 * The project's contacts in a pop-up window over the project page: address book (Outlook-style) or the sheet.
 * Closes with the X button, Escape or a click outside.
 */
export default function ContactsWindow({ token, projectId, projectName, setMessage, onClose }: ContactsWindowProps) {
  const [view, setView] = useState<View>('agenda')
  const closeRef = useRef<HTMLButtonElement>(null)
  // Keep the latest onClose without re-running the open/close effect (it would steal focus on every render).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contacts-window-title"
        className="flex max-h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-canvas shadow-2xl"
      >
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-surface px-5 py-3">
          <Icon name="contacts" className="h-5 w-5 text-brand-700" />
          <h2 id="contacts-window-title" className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">
            Contacts <span className="font-normal text-slate-500">· {projectName}</span>
          </h2>
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5" role="group" aria-label="View">
            {([['agenda', 'Address book'], ['sheet', 'Sheet']] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                aria-pressed={view === key}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === key ? 'bg-brand-700 text-white' : 'text-slate-700 hover:bg-hover'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close contacts" className="rounded-lg p-1.5 text-slate-500 hover:bg-hover hover:text-slate-900">
            <Icon name="close" />
          </button>
        </header>
        <div className="ui-scroll flex-1 overflow-y-auto px-4 pb-4">
          {view === 'agenda' ? (
            <ContactsAgenda token={token} projectId={projectId} setMessage={setMessage} />
          ) : (
            <ProjectContacts token={token} projectId={projectId} setMessage={setMessage} sheetOnly />
          )}
        </div>
      </div>
    </div>
  )
}
