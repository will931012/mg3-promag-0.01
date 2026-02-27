import type { AuthUser } from '../../types/auth'

type UsersPanelProps = {
  users: AuthUser[]
}

export default function UsersPanel({ users }: UsersPanelProps) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Users</h2>
      <p className="mt-1 text-sm text-slate-500">User table for the platform.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              {['ID', 'Username', 'Email', 'Full Name'].map((h) => (
                <th key={h} className="border px-3 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id}>
                <td className="border px-3 py-2">{item.id}</td>
                <td className="border px-3 py-2">{item.username}</td>
                <td className="border px-3 py-2">{item.email}</td>
                <td className="border px-3 py-2">{item.full_name ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
