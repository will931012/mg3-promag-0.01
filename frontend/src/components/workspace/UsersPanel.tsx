import PrimaryButton from '../common/PrimaryButton'
import StatusBadge from '../common/StatusBadge'
import { responseDetail } from '../../services/registerService'
import { updateUserAdmin } from '../../services/workspaceService'
import type { AuthUser } from '../../types/auth'

type UsersPanelProps = {
  token: string
  users: AuthUser[]
  currentUser: AuthUser
  setMessage: (message: string) => void
  refreshWorkspace: (token: string) => Promise<void>
}

export default function UsersPanel({ token, users, currentUser, setMessage, refreshWorkspace }: UsersPanelProps) {
  const toggleAdmin = async (target: AuthUser) => {
    const res = await updateUserAdmin(token, target.id, !target.is_admin)
    if (!res.ok) return setMessage(responseDetail(res.data, 'Failed to update user.'))
    await refreshWorkspace(token)
    setMessage(target.is_admin ? `${target.username} is no longer an admin.` : `${target.username} is now an admin.`)
  }

  return (
    <section className="ui-panel slide-in">
      <h2 className="text-xl font-semibold text-slate-900">Users</h2>
      <p className="mt-1 text-sm text-slate-500">User table for the platform. Admins can edit the master submittal list.</p>
      <div className="ui-scroll mt-4 overflow-x-auto">
        <table className="ui-table min-w-[700px]">
          <thead>
            <tr className="bg-slate-100">
              {['ID', 'Username', 'Email', 'Full Name', 'Role'].map((h) => (
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
                <td className="border px-3 py-2">
                  <div className="flex items-center gap-2">
                    {item.is_admin ? <StatusBadge label="Admin" tone="info" /> : <span className="text-sm text-slate-500">User</span>}
                    {currentUser.is_admin && item.id !== currentUser.id ? (
                      <PrimaryButton type="button" variant="secondary" onClick={() => void toggleAdmin(item)}>
                        {item.is_admin ? 'Remove admin' : 'Make admin'}
                      </PrimaryButton>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
