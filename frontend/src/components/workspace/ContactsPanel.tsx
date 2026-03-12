import { FormEvent, useEffect, useMemo, useState } from 'react'

import { EOR_TYPES } from '../../app/eorTypes'
import type { EorType } from '../../app/eorTypes'
import { createAor, createContractor, createEor, createSubcontractor, fetchAors, fetchContractors, fetchEors, fetchSubcontractors } from '../../services/workspaceService'
import type { AorRecord, ContractorRecord, EorRecord, SubcontractorRecord } from '../../types/workspace'
import EmptyState from '../common/EmptyState'
import PrimaryButton from '../common/PrimaryButton'
import SectionHeader from '../common/SectionHeader'

type ContactsPanelProps = {
  token: string
  setMessage: (message: string) => void
}

type ContactSectionProps<T extends { id: number; name: string }> = {
  title: string
  subtitle: string
  items: T[]
  search: string
  onSearchChange: (value: string) => void
  form: React.ReactNode
}

function ContactSection<T extends { id: number; name: string }>({ title, subtitle, items, search, onSearchChange, form }: ContactSectionProps<T>) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={`Search ${title.toLowerCase()}`}
          className="min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="ui-scroll max-h-[320px] overflow-auto rounded-lg border border-slate-200">
          <table className="ui-table min-w-full">
            <thead>
              <tr className="bg-slate-100">
                <th className="border px-3 py-2 text-left">ID</th>
                <th className="border px-3 py-2 text-left">Name</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="border px-3 py-2">{item.id}</td>
                  <td className="border px-3 py-2">{item.name}</td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={2} className="border px-3 py-8">
                    <EmptyState title={`No ${title.toLowerCase()} found`} description="Create one using the form on the right." />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          {form}
        </div>
      </div>
    </article>
  )
}

export default function ContactsPanel({ token, setMessage }: ContactsPanelProps) {
  const [aors, setAors] = useState<AorRecord[]>([])
  const [eors, setEors] = useState<EorRecord[]>([])
  const [contractors, setContractors] = useState<ContractorRecord[]>([])
  const [subcontractors, setSubcontractors] = useState<SubcontractorRecord[]>([])
  const [aorName, setAorName] = useState('')
  const [eorName, setEorName] = useState('')
  const [eorType, setEorType] = useState<EorType>('Civil EOR')
  const [contractorName, setContractorName] = useState('')
  const [subcontractorName, setSubcontractorName] = useState('')
  const [aorSearch, setAorSearch] = useState('')
  const [eorSearch, setEorSearch] = useState('')
  const [contractorSearch, setContractorSearch] = useState('')
  const [subcontractorSearch, setSubcontractorSearch] = useState('')

  const loadContacts = async () => {
    const [nextAors, nextEors, nextContractors, nextSubcontractors] = await Promise.all([
      fetchAors(token),
      fetchEors(token),
      fetchContractors(token),
      fetchSubcontractors(token),
    ])
    setAors(nextAors)
    setEors(nextEors)
    setContractors(nextContractors)
    setSubcontractors(nextSubcontractors)
  }

  useEffect(() => {
    void loadContacts()
  }, [token])

  const filteredAors = useMemo(() => aors.filter((item) => item.name.toLowerCase().includes(aorSearch.trim().toLowerCase())), [aors, aorSearch])
  const filteredEors = useMemo(() => eors.filter((item) => `${item.type} ${item.name}`.toLowerCase().includes(eorSearch.trim().toLowerCase())), [eors, eorSearch])
  const filteredContractors = useMemo(() => contractors.filter((item) => item.name.toLowerCase().includes(contractorSearch.trim().toLowerCase())), [contractors, contractorSearch])
  const filteredSubcontractors = useMemo(() => subcontractors.filter((item) => item.name.toLowerCase().includes(subcontractorSearch.trim().toLowerCase())), [subcontractors, subcontractorSearch])

  const handleCreateAor = async (event: FormEvent) => {
    event.preventDefault()
    const res = await createAor(token, { name: aorName.trim() })
    if (!res.ok || !res.data) return setMessage('Failed to create AOR.')
    setAorName('')
    setMessage('AOR created.')
    await loadContacts()
  }

  const handleCreateEor = async (event: FormEvent) => {
    event.preventDefault()
    const res = await createEor(token, { type: eorType, name: eorName.trim() })
    if (!res.ok || !res.data) return setMessage('Failed to create EOR.')
    setEorName('')
    setMessage('EOR created.')
    await loadContacts()
  }

  const handleCreateContractor = async (event: FormEvent) => {
    event.preventDefault()
    const res = await createContractor(token, { name: contractorName.trim() })
    if (!res.ok || !res.data) return setMessage('Failed to create contractor.')
    setContractorName('')
    setMessage('Contractor created.')
    await loadContacts()
  }

  const handleCreateSubcontractor = async (event: FormEvent) => {
    event.preventDefault()
    const res = await createSubcontractor(token, { name: subcontractorName.trim() })
    if (!res.ok || !res.data) return setMessage('Failed to create subcontractor.')
    setSubcontractorName('')
    setMessage('Subcontractor created.')
    await loadContacts()
  }

  return (
    <section className="ui-panel slide-in space-y-4">
      <SectionHeader
        title="Contacts"
        subtitle="Central directory for AORs, EORs, contractors and subcontractors used across the workspace."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <ContactSection
          title="AORs"
          subtitle="Architects of record available for project assignments."
          items={filteredAors}
          search={aorSearch}
          onSearchChange={setAorSearch}
          form={
            <form onSubmit={handleCreateAor} className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">Add AOR</h4>
              <input value={aorName} onChange={(event) => setAorName(event.target.value)} placeholder="AOR name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <PrimaryButton type="submit">Save AOR</PrimaryButton>
            </form>
          }
        />

        <ContactSection
          title="EORs"
          subtitle="Engineers of record organized by discipline."
          items={filteredEors.map((item) => ({ ...item, name: `${item.type}: ${item.name}` }))}
          search={eorSearch}
          onSearchChange={setEorSearch}
          form={
            <form onSubmit={handleCreateEor} className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">Add EOR</h4>
              <select value={eorType} onChange={(event) => setEorType(event.target.value as EorType)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {EOR_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <input value={eorName} onChange={(event) => setEorName(event.target.value)} placeholder="EOR name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <PrimaryButton type="submit">Save EOR</PrimaryButton>
            </form>
          }
        />

        <ContactSection
          title="Contractors"
          subtitle="General contractors referenced from RFIs and submittals."
          items={filteredContractors}
          search={contractorSearch}
          onSearchChange={setContractorSearch}
          form={
            <form onSubmit={handleCreateContractor} className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">Add Contractor</h4>
              <input value={contractorName} onChange={(event) => setContractorName(event.target.value)} placeholder="Contractor name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <PrimaryButton type="submit">Save Contractor</PrimaryButton>
            </form>
          }
        />

        <ContactSection
          title="Subcontractors"
          subtitle="Trade partners used in submittal and RFI routing."
          items={filteredSubcontractors}
          search={subcontractorSearch}
          onSearchChange={setSubcontractorSearch}
          form={
            <form onSubmit={handleCreateSubcontractor} className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">Add Subcontractor</h4>
              <input value={subcontractorName} onChange={(event) => setSubcontractorName(event.target.value)} placeholder="Subcontractor name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <PrimaryButton type="submit">Save Subcontractor</PrimaryButton>
            </form>
          }
        />
      </div>
    </section>
  )
}
