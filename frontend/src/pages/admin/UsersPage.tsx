import { useCallback, useEffect, useState } from 'react';

import { usersApi, type UserRecord } from '../../api/users';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { Input } from '../../components/Common/Input';


export function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const load = useCallback(async () => {
    setState('loading');
    try {
      setUsers((await usersApi.getList({ page_size: 100, ...(search ? { search } : {}) })).results);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [search]);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="space-y-6" data-role="admin">
      <div><h1 className="text-display-lg font-bold">Users</h1><p className="text-fg-muted">Real registered TerraNode accounts.</p></div>
      <Card variant="glass" padding="md"><div className="flex gap-3"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search email" /><Button variant="outline" onClick={load}>Search / retry</Button></div></Card>
      {state === 'loading' && <Card variant="glass" padding="lg">Loading users…</Card>}
      {state === 'error' && <Card variant="glass" padding="lg"><p role="alert" className="text-red-300">Could not load users.</p></Card>}
      {state === 'ready' && users.length === 0 && <Card variant="glass" padding="lg">No users found.</Card>}
      {state === 'ready' && users.map((user) => <Card key={user.id} variant="glass" padding="md"><div className="flex justify-between gap-3"><div><p className="font-semibold">{user.full_name}</p><p className="text-fg-muted">{user.email}</p></div><div className="text-right"><p>{user.role} · {user.is_active ? 'Active' : 'Inactive'}</p><p className="font-mono text-body-xs text-fg-muted">{user.sui_public_key || 'No wallet bound'}</p></div></div></Card>)}
    </div>
  );
}
