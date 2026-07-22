import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';

const MOCK_USERS = [
  { id: '1', email: 'farmer_john@example.com', role: 'FARMER', status: 'active', joined: '2024-09-15' },
  { id: '2', email: 'logistics_jane@example.com', role: 'LOGISTICS', status: 'active', joined: '2024-09-20' },
  { id: '3', email: 'admin@example.com', role: 'ADMIN', status: 'active', joined: '2024-08-01' },
];

export function UsersPage() {
  return (
    <div className="space-y-6" data-role="admin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-lg font-bold text-fg-primary">User Management</h1>
          <p className="text-body text-fg-muted mt-1">Manage platform users and roles</p>
        </div>
        <Button variant="primary">Add User</Button>
      </div>

      <Card variant="glass" padding="md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase">Email</th>
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase">Role</th>
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase">Status</th>
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase">Joined</th>
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary/50">
              {MOCK_USERS.map((user) => (
                <tr key={user.id} className="hover:bg-bg-tertiary/50">
                  <td className="px-4 py-3 text-body-sm text-fg-primary">{user.email}</td>
                  <td className="px-4 py-3 text-body-sm text-fg-secondary">{user.role}</td>
                  <td className="px-4 py-3 text-body-sm text-fg-secondary">{user.status}</td>
                  <td className="px-4 py-3 text-body-sm text-fg-secondary">{user.joined}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
