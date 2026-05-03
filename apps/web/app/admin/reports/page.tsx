"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    ShieldAlert, AlertTriangle, Clock, CheckCircle2, XCircle,
    MessageSquare, Store, User as UserIcon, RefreshCw,
    ChevronRight, ExternalLink, Filter, Search, Loader2,
    Flag, ShieldCheck, AlertCircle
} from 'lucide-react';
import { api, getImageUrl } from '../../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ListSkeleton } from '../../../components/SkeletonLoader';

type ReportTab = 'reviews' | 'businesses' | 'users';

export default function AdminReportsPage() {
    const [activeTab, setActiveTab] = useState<ReportTab>('reviews');
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState<any[]>([]);
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [stats, setStats] = useState({
        flaggedReviews: 0,
        pendingBusinesses: 0,
        suspiciousUsers: 0
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch flagged reviews
            const reviewRes = await api.reviews.adminGetAll({ isSuspicious: 'true', limit: 10 });
            setReviews(reviewRes.data || []);

            // Fetch pending businesses
            const businessRes = await api.admin.getBusinesses(1, 10, 'pending');
            setBusinesses(businessRes.data || []);

            // Stats summary (simulated based on fetched data or real endpoints if available)
            setStats({
                flaggedReviews: reviewRes.meta?.total || 0,
                pendingBusinesses: businessRes.meta?.total || 0,
                suspiciousUsers: 0 // Backend doesn't have a flagged user endpoint yet
            });
        } catch (err) {
            console.error('Failed to fetch report data', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleModerateReview = async (id: string, action: { isApproved: boolean; isSuspicious: boolean }) => {
        try {
            await api.reviews.adminModerate(id, action);
            setReviews(prev => prev.filter(r => r.id !== id));
            setStats(s => ({ ...s, flaggedReviews: Math.max(0, s.flaggedReviews - 1) }));
        } catch (err) {
            alert('Moderation failed');
        }
    };

    const handleModerateBusiness = async (id: string, status: 'approved' | 'rejected') => {
        try {
            await api.admin.moderateBusiness(id, status);
            setBusinesses(prev => prev.filter(b => b.id !== id));
            setStats(s => ({ ...s, pendingBusinesses: Math.max(0, s.pendingBusinesses - 1) }));
        } catch (err) {
            alert('Moderation failed');
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-100 rounded-full mb-3">
                        <Flag className="w-3 h-3 text-red-500" />
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Moderation Center</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1">
                        Reports & <span className="text-red-600">Moderation</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">Review flagged content and pending submissions that require attention.</p>
                </div>

                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={`p-6 rounded-[24px] border-2 text-left transition-all ${activeTab === 'reviews' ? 'bg-red-50/50 border-red-500/20 ring-4 ring-red-500/5' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${activeTab === 'reviews' ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-slate-100 text-slate-400'}`}>
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 leading-none">{stats.flaggedReviews}</p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Flagged Reviews</p>
                </button>

                <button
                    onClick={() => setActiveTab('businesses')}
                    className={`p-6 rounded-[24px] border-2 text-left transition-all ${activeTab === 'businesses' ? 'bg-amber-50/50 border-amber-500/20 ring-4 ring-amber-500/5' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${activeTab === 'businesses' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-slate-100 text-slate-400'}`}>
                        <Store className="w-6 h-6" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 leading-none">{stats.pendingBusinesses}</p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pending Listings</p>
                </button>

                <button
                    onClick={() => setActiveTab('users')}
                    className={`p-6 rounded-[24px] border-2 text-left transition-all ${activeTab === 'users' ? 'bg-slate-900 border-slate-900 ring-4 ring-slate-950/5' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${activeTab === 'users' ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-400'}`}>
                        <UserIcon className="w-6 h-6" />
                    </div>
                    <p className={`text-2xl font-black leading-none ${activeTab === 'users' ? 'text-white' : 'text-slate-900'}`}>0</p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Suspicious Users</p>
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white  rounded-[15px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="font-black text-slate-900 text-xl flex items-center gap-3">
                        {activeTab === 'reviews' && <><MessageSquare className="w-5 h-5 text-red-500" /> Flagged Content</>}
                        {activeTab === 'businesses' && <><Store className="w-5 h-5 text-amber-500" /> Business Validation</>}
                        {activeTab === 'users' && <><UserIcon className="w-5 h-5 text-slate-900" /> Account Security</>}
                    </h3>
                </div>

                <div className="p-8">
                    {loading ? (
                        <div className="space-y-6">
                            <ListSkeleton />
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            {activeTab === 'reviews' && (
                                <motion.div
                                    key="reviews"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-4"
                                >
                                    {reviews.length === 0 ? (
                                        <EmptyState icon={ShieldCheck} title="All Clean!" description="There are no flagged reviews currently awaiting moderation." />
                                    ) : (
                                        reviews.map(review => (
                                            <div key={review.id} className="p-6 rounded-[24px] bg-slate-50 border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/40">
                                                <div className="flex gap-6">
                                                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shrink-0">
                                                        <UserIcon className="w-5 h-5 text-slate-300" />
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div>
                                                                <span className="text-xs font-black text-slate-900 mr-2">{review.user?.fullName || 'Anonymous'}</span>
                                                                <span className="text-[10px] font-bold text-slate-400">{formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-red-200">
                                                                    Flagged
                                                                </span>
                                                                <span className="px-2 py-0.5 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-wider">
                                                                    {review.rating} / 5
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <p className="text-slate-600 leading-relaxed text-sm font-medium mb-4 italic">
                                                            "{review.comment}"
                                                        </p>

                                                        <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                                                    <Store className="w-3 h-3" /> {review.business?.name || 'Unknown Business'}
                                                                </span>
                                                                {review.suspicionReason && (
                                                                    <span className="text-[10px] font-bold text-orange-500 flex items-center gap-1.5">
                                                                        <AlertTriangle className="w-3 h-3" /> {review.suspicionReason}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleModerateReview(review.id, { isApproved: false, isSuspicious: false })}
                                                                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-red-500 hover:bg-red-50 hover:border-red-200 transition-all uppercase tracking-widest"
                                                                >
                                                                    Reject & Remove
                                                                </button>
                                                                <button
                                                                    onClick={() => handleModerateReview(review.id, { isApproved: true, isSuspicious: false })}
                                                                    className="px-4 py-2 bg-emerald-500 border border-emerald-600 rounded-xl text-[10px] font-black text-white hover:bg-emerald-600 transition-all uppercase tracking-widest shadow-sm"
                                                                >
                                                                    Clear Flag
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'businesses' && (
                                <motion.div
                                    key="businesses"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-4"
                                >
                                    {businesses.length === 0 ? (
                                        <EmptyState icon={ShieldCheck} title="Queue Empty" description="All business listings have been reviewed. Good job!" />
                                    ) : (
                                        businesses.map(business => (
                                            <div key={business.id} className="p-6 rounded-[24px] bg-slate-50 border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/40">
                                                <div className="flex gap-6">
                                                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                                        {business.logoUrl ? (
                                                            <img src={getImageUrl(business.logoUrl) || ''} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Store className="w-7 h-7 text-slate-200" />
                                                        )}
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="font-black text-slate-900 tracking-tight">{business.title}</h4>
                                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-200">
                                                                Pending Approval
                                                            </span>
                                                        </div>
                                                        <p className="text-slate-400 text-xs font-bold flex items-center gap-1.5 mb-5">
                                                            <Clock className="w-3.5 h-3.5" /> Added {formatDistanceToNow(new Date(business.createdAt), { addSuffix: true })}
                                                        </p>

                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-6">
                                                                <div>
                                                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Category</p>
                                                                    <p className="text-[11px] font-black text-slate-600">{business.category?.name || 'Uncategorized'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Owner</p>
                                                                    <p className="text-[11px] font-black text-slate-600">{business.vendor?.businessName || 'Owner'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleModerateBusiness(business.id, 'rejected')}
                                                                    className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                                                                    title="Reject Listing"
                                                                >
                                                                    <XCircle className="w-5 h-5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleModerateBusiness(business.id, 'approved')}
                                                                    className="px-6 py-3 bg-slate-900 border border-slate-950 rounded-xl text-[11px] font-black text-white hover:bg-slate-800 transition-all uppercase tracking-widest shadow-lg shadow-slate-900/20"
                                                                >
                                                                    Validate & Approve
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'users' && (
                                <motion.div
                                    key="users"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="pt-10 flex flex-col items-center text-center max-w-sm mx-auto"
                                >
                                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                                        <ShieldCheck className="w-10 h-10 text-slate-200" />
                                    </div>
                                    <h4 className="text-xl font-black text-slate-900">User Security Module</h4>
                                    <p className="text-slate-400 font-medium text-sm mt-2">
                                        Automated flagging for users with suspicious activity will be integrated here in the next update.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
}

function EmptyState({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <div className="py-20 flex flex-col items-center text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center mb-6 border border-slate-100">
                <Icon className="w-10 h-10 text-slate-200" />
            </div>
            <h4 className="text-xl font-black text-slate-900">{title}</h4>
            <p className="text-slate-400 font-medium text-sm mt-1">{description}</p>
        </div>
    );
}
