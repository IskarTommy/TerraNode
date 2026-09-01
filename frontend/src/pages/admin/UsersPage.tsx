import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/users';
import { useUsers } from '../../hooks/useDashboardQueries';
import { Card } from '../../components/Common/Card';

export function UsersPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError } = useUsers({ search: search || undefined });
  const queryClient = useQueryClient();
  const updateUser = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => usersApi.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
  return <div className="space-y-6" data-role="admin">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Access control</p><h1 className="text-3xl font-bold text-fg-primary">User management</h1><p className="mt-1 text-sm text-fg-muted">Review roles and suspend or restore accounts.</p></div><input className="min-h-11 rounded-xl border border-border-primary bg-bg-tertiary px-4 text-fg-primary outline-none focus:border-cyan-500" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" aria-label="Search users" /></div>
    <Card variant="glass" padding="md">{isLoading && <p className="py-10 text-center text-fg-muted">Loading users…</p>}{isError && <p className="py-10 text-center text-red-400">Users could not be loaded.</p>}{!isLoading && !isError && <div className="overflow-x-auto"><table className="w-full min-w-[680px]"><thead><tr className="border-b border-border-primary text-left text-xs uppercase text-fg-muted"><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Wallet</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-border-primary/50">{(data?.results ?? []).map((user) => <tr key={user.id} className="hover:bg-bg-tertiary/40"><td className="p-3"><p className="font-medium text-fg-primary">{user.full_name || 'Unnamed user'}</p><p className="text-xs text-fg-muted">{user.email}</p></td><td className="p-3 text-sm text-fg-secondary">{user.role}</td><td className="max-w-48 truncate p-3 font-mono text-xs text-fg-muted">{user.sui_public_key || 'Not linked'}</td><td className="p-3 text-sm"><span className={user.is_active ? 'text-emerald-400' : 'text-amber-400'}>{user.is_active ? 'Active' : 'Suspended'}</span></td><td className="p-3"><button className="min-h-9 rounded-lg border border-border-primary px-3 text-sm text-fg-primary hover:border-cyan-500 disabled:opacity-50" disabled={updateUser.isPending} onClick={() => updateUser.mutate({ id: user.id, is_active: !user.is_active })}>{user.is_active ? 'Suspend' : 'Restore'}</button></td></tr>)}</tbody></table>{data?.results.length === 0 && <p className="py-12 text-center text-fg-muted">No users match this search.</p>}</div>}</Card>
  </div>;
}
