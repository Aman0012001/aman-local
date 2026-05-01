"use client";

import React, { useState, useEffect } from 'react';
import {
    Users,
    ListTree,
    Star,
    CheckCircle,
    Trash2,
    ShieldAlert,
    TrendingUp,
    Briefcase,
    MessageSquare,
    ChevronRight,
    Check,
    X
} from 'lucide-react';
import { api } from '../../lib/api';
import StatsGrid from '../../components/vendor/StatsGrid';
import { Business } from '../../types/api';
import Link from 'next/link';

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [recentBusinesses, setRecentBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [statsData, businessesData] = await Promise.all([
                api.admin.getStats(),
                api.admin.getBusinesses(1, 10, 'pending') // Focus on pending vendor requests
            ]);
            setStats(statsData);
            setRecentBusinesses(businessesData.data || []);
        } catch (err) {
            console.error('Failed to fetch admin data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleModerate = async (id: string, status: 'approved' | 'rejected') => {
        const action = status === 'approved' ? 'approve' : 'reject';
        if (!confirm(`Are you sure you want to ${action} this business?`)) return;

        setActionId(id);
        try {
            await api.admin.moderateBusiness(id, status);
            // Refresh data after moderation
            await fetchData();
        } catch (err) {
            console.error(`Failed to ${action} business:`, err);
            alert(`Failed to ${action} business. Please try again.`);
        } finally {
            setActionId(null);
        }
    };

    const mappedStats = [
        {
            label: 'Total Users',
            value: stats?.totalUsers || '0',
            icon: Users,
            color: 'bg-gradient-to-br from-[#EE4444] to-[#CC2222]',
            accentColor: 'bg-white/10'
        },
        {
            label: 'Total Businesses',
            value: stats?.totalBusinesses || '0',
            icon: Briefcase,
            color: 'bg-gradient-to-br from-[#3366CC] to-[#1144AA]',
            accentColor: 'bg-white/10'
        },
        {
            label: 'Total Reviews',
            value: stats?.totalReviews || '0',
            icon: MessageSquare,
            color: 'bg-gradient-to-br from-[#33AA88] to-[#118866]',
            accentColor: 'bg-white/10'
        },
        {
            label: 'Pending Verification',
            value: stats?.pendingBusinesses || '0',
            icon: ShieldAlert,
            color: 'bg-gradient-to-br from-[#FFAA33] to-[#FF8811]',
            accentColor: 'bg-white/10'
        },
    ];

    if (loading) return <div className="p-10 text-slate-400 font-bold uppercase tracking-widest text-center">Loading Admin Dashboard...</div>;

    return (
        <div className="space-y-12 pb-20">
            {/* Admin Header */}
            <div>
                <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-3 tracking-tight">System Administration</h1>
                <p className="text-slate-400 font-bold tracking-tight text-lg">Manage users, businesses, and platform health.</p>
            </div>

            {/* Global Stats */}
            <StatsGrid stats={mappedStats} />

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Recent Businesses / Vendor Requests */}
                <div className="bg-white rounded-[16px] p-8 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Vendor Requests</h3>
                            <p className="text-xs text-slate-400 font-bold">Awaiting your approval</p>
                        </div>
                        <Link href="/admin/businesses?status=pending" className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors flex items-center gap-2">
                            Manage All <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {recentBusinesses.length > 0 ? (
                            recentBusinesses.map((business) => (
                                <div key={business.id} className="p-6 bg-slate-50 rounded-3xl flex items-center justify-between group hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-500 border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm overflow-hidden border border-slate-100">
                                            {business.logoUrl ? (
                                                <img src={business.logoUrl} alt={business.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <ListTree className="w-6 h-6 text-blue-500" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900">{business.title}</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                                {business.category?.name || 'Uncategorized'} · {business.city}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleModerate(business.id, 'approved')}
                                            disabled={!!actionId}
                                            className="p-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all active:scale-90 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                                            title="Approve Business"
                                        >
                                            {actionId === business.id ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <Check className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleModerate(business.id, 'rejected')}
                                            disabled={!!actionId}
                                            className="p-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-all active:scale-90 disabled:opacity-50 shadow-lg shadow-red-500/20"
                                            title="Reject Business"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                    <Check className="w-8 h-8 text-slate-200" />
                                </div>
                                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Inbox Zero</p>
                                <p className="text-slate-300 text-xs mt-1">No pending vendor requests at the moment.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* System Tasks Placeholder */}
                <div className="bg-slate-900 rounded-[16px] p-8 text-white shadow-2xl shadow-red-500/10">
                    <h3 className="text-2xl font-black mb-8 tracking-tight">Critical Actions</h3>
                    <div className="space-y-4">
                        <Link href="/admin/reports" className="w-full p-6 bg-white/5 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all text-left block">
                            <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center">
                                <ShieldAlert className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <p className="font-bold">Moderate Reported Content</p>
                                <p className="text-xs text-slate-400">Manage community reports</p>
                            </div>
                        </Link>
                        <Link href="/admin/listings?status=pending" className="w-full p-6 bg-white/5 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all text-left block">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="font-bold">Verify New Vendors</p>
                                <p className="text-xs text-slate-400">{stats?.pendingBusinesses || 0} business(es) awaiting review</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
