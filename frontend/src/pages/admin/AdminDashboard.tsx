import { useState } from 'react';
import { StatCard } from '../../components/Dashboard/FarmerDashboard';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { cn } from '../../utils/cn';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/Common';
import { useToast } from '../../components/Common';

// Mock data
const MOCK_SYSTEM_METRICS = [
    { name: 'CPU Usage', value: 65, status: 'warning' as const },
    { name: 'Memory Usage', value: 78, status: 'critical' as const },
    { name: 'Disk Space', value: 45, status: 'normal' as const },
    { name: 'Network Latency', value: 34, status: 'normal' as const },
];

type ActivityStatus = 'success' | 'warning' | 'error';
interface Activity { id: number; action: string; user: string; timestamp: string; status: ActivityStatus; }

const MOCK_RECENT_ACTIVITIES: Activity[] = [
    { id: 1, action: 'User registered', user: 'farmer_john@example.com', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), status: 'success' },
    { id: 2, action: 'Batch minted', user: 'farmer_jane@example.com', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), status: 'success' },
    { id: 3, action: 'Sensor calibration failed', user: 'system', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), status: 'error' },
    { id: 4, action: 'Data backup completed', user: 'system', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), status: 'success' },
];

const MODULE_USAGE = [
    { name: 'Farmer Dashboard', users: 1245, growth: 12 },
    { name: 'Logistics Tracking', users: 890, growth: 8 },
    { name: 'Admin Panel', users: 12, growth: 20 },
];

export function AdminDashboard() {
    const [showSystemDialog, setShowSystemDialog] = useState(false);
    const [showUserDialog, setShowUserDialog] = useState(false);
    const { showToast } = useToast();

    return (
        <div className="space-y-6" data-role="admin">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-display-lg font-bold text-fg-primary">Admin Dashboard</h1>
                    <p className="text-body text-fg-muted mt-1">System overview, user management, integrity audits.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => showToast('Dashboard refreshed', 'success')}>Refresh Data</Button>
                    <Button variant="secondary" onClick={() => setShowSystemDialog(true)}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16h.01"/></svg>
                        System Health
                    </Button>
                    <Button variant="secondary" onClick={() => setShowUserDialog(true)}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                        User Management
                    </Button>
                </div>
            </div>

            {/* System Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {MOCK_SYSTEM_METRICS.map((metric, index) => (
                    <StatCard
                        key={index}
                        title={metric.name}
                        value={`${metric.value}%`}
                        change={Math.abs(Math.round(Math.random() * 10) - 5)}
                        changeLabel={Math.random() > 0.5 ? 'from last hour' : 'from yesterday'}
                        trend={Math.random() > 0.5 ? 'up' : 'down'}
                        variant={metric.status === 'normal' ? 'success' : metric.status === 'warning' ? 'warning' : 'error'}
                    />
                ))}
            </div>

            {/* Module Usage Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {MODULE_USAGE.map((mod, index) => (
                    <Card key={index} variant="glass" padding="md" className="hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-bg/20 flex items-center justify-center text-primary-fg font-semibold">
                                    {mod.users > 1000 ? '👥' : mod.users > 100 ? '👥' : '👤'}
                                </div>
                                <div>
                                    <h3 className="text-body font-semibold text-fg-primary">{mod.name}</h3>
                                    <p className="text-body-xs text-fg-muted">Active Users</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-display-md font-bold text-fg-primary">{mod.users.toLocaleString()}</p>
                                <p className={cn('text-body-xs font-medium', mod.growth > 0 ? 'text-emerald-500' : 'text-red-500')}>
                                    {mod.growth > 0 ? `+${mod.growth}%` : `${mod.growth}%`} vs last month
                                </p>
                            </div>
                        </div>
                        <div className="w-full bg-bg-tertiary/50 rounded-full h-2.5 mt-4">
                            <div className="bg-primary-bg h-2.5 rounded-full" style={{ width: Math.min(100, mod.users / 20) }} />
                        </div>
                    </Card>
                ))}
            </div>

            {/* Recent Activity and System Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card variant="glass" padding="md">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-body font-semibold text-fg-primary">Recent Activity</h3>
                        <Button variant="outline" size="sm">View All</Button>
                    </div>
                    <div className="space-y-3">
                        {MOCK_RECENT_ACTIVITIES.map((activity) => (
                            <div key={activity.id} className="p-3 rounded-xl bg-bg-tertiary/50 border border-border-primary/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                                        {activity.status === 'success' ? (
                                            <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        ) : activity.status === 'warning' ? (
                                            <svg className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        ) : (
                                            <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-body-sm font-medium text-fg-primary">{activity.action}</p>
                                        <p className="text-body-xs text-fg-muted">
                                            <span className="text-fg-muted">{activity.user}</span>
                                            <span className="text-fg-muted"> • </span>
                                            <span className="text-fg-muted">{new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </p>
                                    </div>
                                </div>
                                <span className={cn('px-2 py-0.5 rounded-full text-body-xs font-medium',
                                    activity.status === 'success' && 'bg-emerald-500/20 text-emerald-500',
                                    activity.status === 'warning' && 'bg-amber-500/20 text-amber-500',
                                    activity.status === 'error' && 'bg-red-500/20 text-red-500',
                                )}>
                                    {activity.status === 'success' ? 'Success' : activity.status === 'warning' ? 'Warning' : 'Critical'}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* System Performance Chart */}
                <Card variant="glass" padding="md">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-body font-semibold text-fg-primary">System Performance (24h)</h3>
                    </div>
                    <div className="h-[200px] bg-bg-tertiary/50 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                            <svg className="h-12 w-12 mx-auto text-fg-muted mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 002 2v6a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            <p className="text-body text-fg-muted">System metrics visualization</p>
                            <p className="text-body-xs text-fg-muted mt-1">CPU, Memory, Disk, Network utilization</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* System Health Dialog */}
            <Dialog open={showSystemDialog} onOpenChange={setShowSystemDialog} className="w-96 sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>System Health Details</DialogTitle>
                    <DialogDescription>Detailed view of system performance metrics and health indicators.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                        {MOCK_SYSTEM_METRICS.map((metric, index) => (
                            <Card key={index} variant="glass" padding="md">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                                            {metric.status === 'normal' ? (
                                                <svg className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            ) : metric.status === 'warning' ? (
                                                <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            ) : (
                                                <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-body font-semibold text-fg-primary">{metric.name}</h3>
                                            <p className="text-body-xs text-fg-muted">Current utilization level</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-display-md font-bold text-fg-primary tabular-nums">{metric.value}%</p>
                                        <span className={cn('inline-block px-2 py-0.5 rounded-full text-body-xs font-medium',
                                            metric.status === 'normal' && 'bg-emerald-500/10 text-emerald-500',
                                            metric.status === 'warning' && 'bg-amber-500/10 text-amber-500',
                                            metric.status === 'critical' && 'bg-red-500/10 text-red-500',
                                        )}>
                                            {metric.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full bg-bg-tertiary/50 rounded-full h-2.5">
                                    <div className="h-2.5 rounded-full transition-all duration-500"
                                        style={{
                                            width: `${Math.min(100, metric.value)}%`,
                                            backgroundColor: metric.status === 'normal' ? '#10b981' : metric.status === 'warning' ? '#f59e0b' : '#ef4444',
                                        }}
                                    />
                                </div>
                                <div className="mt-2 flex flex-col gap-1 text-body-xs text-fg-muted">
                                    <span>Status: {metric.status === 'normal' ? 'Optimal' : metric.status === 'warning' ? 'Elevated' : 'Critical'}</span>
                                    <span>Last updated: {(Date.now() - index * 300000).toLocaleString()}</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
                <DialogFooter className="flex justify-end space-x-3">
                    <Button variant="ghost" onClick={() => setShowSystemDialog(false)}>Close</Button>
                    <Button variant="primary" onClick={() => { setShowSystemDialog(false); showToast('Report generated', 'success'); }}>Generate Report</Button>
                </DialogFooter>
            </Dialog>

            {/* User Management Dialog */}
            <Dialog open={showUserDialog} onOpenChange={setShowUserDialog} className="w-96 sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>User Management</DialogTitle>
                    <DialogDescription>Overview of platform users, roles, and activity.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-body font-semibold text-fg-primary">User Statistics</h3>
                            <Button variant="outline" size="sm" onClick={() => showToast('User data exported', 'success')}>Export Data</Button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center justify-between p-4 bg-bg-tertiary/50 rounded-xl">
                                <div className="text-left"><p className="text-body-xs text-fg-muted">Total Users</p><p className="text-display-md font-bold text-fg-primary">1,257</p></div>
                                <div className="text-right"><p className="text-body-xs text-fg-muted">Active Today</p><p className="text-body font-semibold text-fg-primary">234</p></div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-bg-tertiary/50 rounded-xl">
                                <div className="text-left"><p className="text-body-xs text-fg-muted">Farmers</p><p className="text-display-md font-bold text-fg-primary">980</p></div>
                                <div className="text-right"><p className="text-body-xs text-fg-muted">Logistics</p><p className="text-body font-semibold text-fg-primary">187</p></div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-bg-tertiary/50 rounded-xl">
                                <div className="text-left"><p className="text-body-xs text-fg-muted">Admins</p><p className="text-display-md font-bold text-fg-primary">12</p></div>
                                <div className="text-right"><p className="text-body-xs text-fg-muted">Pending Verification</p><p className="text-body font-semibold text-fg-primary">8</p></div>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-border-primary/50 pt-4">
                        <h3 className="text-body font-semibold text-fg-primary mb-3">Recent User Activity</h3>
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="p-3 rounded-xl bg-bg-tertiary/50 border border-border-primary/50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-bg/20">
                                            <span className="text-fg-primary font-bold">{['A', 'B', 'C', 'D', 'E'][i - 1]}</span>
                                        </div>
                                        <div>
                                            <p className="text-body-sm font-medium text-fg-primary">User #{1000 + i} completed action</p>
                                            <p className="text-body-xs text-fg-muted">Action: Batch verification</p>
                                        </div>
                                    </div>
                                    <span className="text-body-xs text-fg-muted">+{i * 15} XP</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter className="flex justify-end space-x-3">
                    <Button variant="ghost" onClick={() => setShowUserDialog(false)}>Close</Button>
                    <Button variant="primary" onClick={() => { setShowUserDialog(false); showToast('Settings updated', 'success'); }}>Save Changes</Button>
                </DialogFooter>
            </Dialog>
        </div>
    );
}

export default AdminDashboard;
