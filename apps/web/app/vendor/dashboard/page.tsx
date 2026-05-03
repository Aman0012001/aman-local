"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StatsGrid from '../../../components/vendor/StatsGrid';
import PerformanceChart from '../../../components/vendor/PerformanceChart';
import RecentReviews from '../../../components/vendor/RecentReviews';
import MessageCenter from '../../../components/vendor/MessageCenter';
import { Star, ChevronRight, ListTree, Heart, MessageSquare, Plus, TrendingUp, Loader2, Bell, CheckCircle2, Sparkles, Share2, Copy, Gift, Mail, Clock, BadgeCheck } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import { api, getImageUrl } from '../../../lib/api';
import { Business, Review } from '../../../types/api';
import { motion, AnimatePresence } from 'framer-motion';
import VendorHotDemandWidget from '../../components/vendor/VendorHotDemandWidget';
import VendorLeadsInbox from '../../../components/leads/VendorLeadsInbox';
import MyJobLeads from '../../../components/leads/MyJobLeads';
import MyInquiries from '../../../components/leads/MyInquiries';
import { chatApi } from '../../../services/chat.service';
import { useChatSocket } from '../../../hooks/useChat';

export default function GenericDashboard() {
    const router = useRouter();
    const { user, updateUser } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [savedBusinesses, setSavedBusinesses] = useState<Business[]>([]);
    const [recentReviews, setRecentReviews] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [leads, setLeads] = useState<any[]>([]);
    const [newLeadsCount, setNewLeadsCount] = useState(0);
    const [enquiries, setEnquiries] = useState<any[]>([]);
    const [followedBusinesses, setFollowedBusinesses] = useState<Business[]>([]);
    const [demandInsights, setDemandInsights] = useState<any[]>([]);
    const [affiliateStats, setAffiliateStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copySuccess, setCopySuccess] = useState(false);
    const [referralInput, setReferralInput] = useState('');
    const [isApplying, setIsApplying] = useState(false);
    const [applyStatus, setApplyStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [conversations, setConversations] = useState<any[]>([]);
    const [performanceData, setPerformanceData] = useState<any[]>([]);
    const [performancePeriod, setPerformancePeriod] = useState('7 Days');
    const [performanceLoading, setPerformanceLoading] = useState(false);
    const { socket } = useChatSocket();

    const isVendor = user?.role === 'vendor';
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            try {
                setLoading(true);

                // Common data for everyone
                const [userProfile, favoritesData, followsData] = await Promise.all([
                    api.users.getProfile(),
                    api.users.getFavorites(),
                    api.follows.myFollows()
                ]);

                setSavedBusinesses(favoritesData.data || []);
                setFollowedBusinesses(followsData.data || []);

                if (isVendor || isAdmin) {
                    // Vendor/Admin specific data - Fetch static data once
                    const [statsData, vendorProfile, affiliateData] = await Promise.all([
                        api.vendors.getStats(),
                        api.vendors.getProfile(),
                        api.affiliate.getStats().catch(() => null)
                    ]);

                    setStats(statsData);
                    setAffiliateStats(affiliateData);

                    if (vendorProfile?.id) {
                        const [reviewsData, leadsData, enquiriesData] = await Promise.all([
                            api.reviews.findAll({ vendorId: vendorProfile.id, limit: 5 }),
                            api.leads.getForVendor({ limit: 5 }),
                            api.leads.getForVendor({ limit: 5, type: 'chat' })
                        ]);
                        setRecentReviews(reviewsData.data || []);
                        setLeads(leadsData.data || []);
                        setNewLeadsCount(leadsData.meta?.total || 0);
                        setEnquiries(enquiriesData.data || []);
                    }

                    const demandData = await api.demand.getNearby();
                    setDemandInsights(demandData || []);
                } else {
                    // Regular User specific data
                    const [reviewsData, notifsData] = await Promise.all([
                        api.reviews.findAll({ userId: user.id, limit: 5 }),
                        api.users.getNotifications({ limit: 5 })
                    ]);
                    setRecentReviews(reviewsData.data || []);
                    setNotifications(notifsData.data || []);

                    // Simple stats for users
                    setStats({
                        savedCount: favoritesData.data?.length || 0,
                        reviewsCount: reviewsData.data?.length || 0,
                        unreadNotifs: notifsData.data?.filter((n: any) => !n.isRead).length || 0
                    });
                }

                if (isVendor || isAdmin) {
                    const convs = await chatApi.getVendorConversations() as any[];
                    setConversations(convs.slice(0, 5));
                } else if (user) {
                    const convs = await chatApi.getUserConversations() as any[];
                    setConversations(convs.slice(0, 5));
                }

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user, isVendor, isAdmin]);

    // Isolated Performance Matrix Fetching
    useEffect(() => {
        const fetchPerformanceStats = async () => {
            if (!(isVendor || isAdmin)) return;
            try {
                setPerformanceLoading(true);
                const leadsStats = await api.leads.getStats(
                    performancePeriod === '7 Days' ? '7d' :
                        performancePeriod === '30 Days' ? '30d' : '90d'
                );
                if (leadsStats && leadsStats.dailyTrend) {
                    setPerformanceData(leadsStats.dailyTrend);
                }
            } catch (error) {
                console.error('Error fetching performance stats:', error);
            } finally {
                setPerformanceLoading(false);
            }
        };

        if (user) fetchPerformanceStats();
    }, [performancePeriod, user, isVendor, isAdmin]);

    // Real-time chat updates
    useEffect(() => {
        if (!socket) return;

        const onNewConversation = (conv: any) => {
            setConversations(prev => {
                if (prev.find(c => c.id === conv.id)) return prev;
                return [conv, ...prev].slice(0, 5);
            });
        };

        const onConversationUpdated = (update: any) => {
            setConversations(prev => {
                const existing = prev.find(c => c.id === update.conversationId);
                if (existing) {
                    return prev.map(c =>
                        c.id === update.conversationId
                            ? { ...c, lastMessage: update.lastMessage, lastMessageAt: update.lastMessageAt }
                            : c
                    ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
                } else {
                    // If not in list, maybe it's a new one that just got updated
                    chatApi.getVendorConversations().then((convs: any) => {
                        setConversations(convs.slice(0, 5));
                    });
                    return prev;
                }
            });
        };

        socket.on('newConversation', onNewConversation);
        socket.on('conversationUpdated', onConversationUpdated);

        return () => {
            socket.off('newConversation', onNewConversation);
            socket.off('conversationUpdated', onConversationUpdated);
        };
    }, [socket]);

    const activeSub = isAdmin ? {
        plan: {
            name: 'Super Admin',
            planType: 'paid',
            dashboardFeatures: {
                showListings: true,
                canAddListing: true,
                showSaved: true,
                showFollowing: true,
                showQueries: true,
                showLeads: true,
                showOffers: true,
                showReviews: true,
                showAnalytics: true,
                showChat: true,
                showBroadcast: true,
                showDemand: true,
                maxKeywords: 999
            }
        },
        endDate: user?.vendor?.activeSubscription?.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active'
    } : (user?.vendor?.activeSubscription || user?.vendor?.subscriptions?.find((sub: any) => sub.status === 'active'));


    // Default features logic - All vendors and admins have full access
    const features: Record<string, any> = isAdmin ? {
        showListings: true,
        canAddListing: true,
        showSaved: true,
        showFollowing: true,
        showQueries: true,
        showLeads: true,
        showOffers: true,
        showReviews: true,
        showAnalytics: true,
        showChat: true,
        showBroadcast: true,
        showDemand: true,
        maxKeywords: 999
    } : (activeSub?.plan?.dashboardFeatures || {});


    const vendorStats = [
        {
            label: 'Total Listings',
            value: stats?.businessCount || '0',
            icon: ListTree,
            color: 'bg-[#004a99]',
            accentColor: 'bg-white/10',
            onClick: () => router.push('/vendor/add-listing'),
            show: !!features.showListings
        },
        {
            label: 'Pending Approval',
            value: stats?.pendingCount || '0',
            icon: Clock,
            color: 'bg-white',
            accentColor: 'bg-amber-50',
            textColor: 'text-amber-600',
            onClick: () => router.push('/vendor/pending-listings'),
            show: !!features.showListings
        },
        {
            label: 'Live Chat',
            value: String(conversations.length),
            icon: MessageSquare,
            color: 'bg-white',
            accentColor: 'bg-blue-50',
            textColor: 'text-[#004a99]',
            onClick: () => router.push('/vendor/chat'),
            show: !!features.showChat
        },
        ...(features.showAnalytics ? [{
            label: 'Total Views',
            value: stats?.totalViews || '0',
            icon: Heart,
            color: 'bg-white',
            accentColor: 'bg-rose-50',
            textColor: 'text-rose-500'
        }] : []),
        ...(features.showLeads ? [{
            label: 'New Leads',
            value: String(newLeadsCount),
            icon: MessageSquare,
            color: 'bg-[#ff7a00]',
            accentColor: 'bg-white/10'
        }] : []),
        ...(features.showReviews ? [{
            label: 'Total Reviews',
            value: stats?.totalReviews || recentReviews.length || '0',
            icon: Star,
            color: 'bg-white',
            accentColor: 'bg-emerald-50',
            textColor: 'text-emerald-500'
        }] : []),
    ].filter(s => (s as any).show !== false);

    const userStats = [
        {
            label: 'Saved Businesses',
            value: String(stats?.savedCount || 0),
            icon: Heart,
            color: 'bg-white',
            accentColor: 'bg-rose-50',
            textColor: 'text-rose-500',
            onClick: () => router.push('/vendor/saved')
        },
        {
            label: 'Messages',
            value: String(conversations.length),
            icon: MessageSquare,
            color: 'bg-[#004a99]',
            accentColor: 'bg-white/10',
            onClick: () => router.push('/vendor/chat')
        },
        {
            label: 'Your Reviews',
            value: String(stats?.reviewsCount || 0),
            icon: Star,
            color: 'bg-white',
            accentColor: 'bg-amber-50',
            textColor: 'text-amber-600'
        },
        {
            label: 'Notifications',
            value: String(stats?.unreadNotifs || 0),
            icon: Bell,
            color: 'bg-white',
            accentColor: 'bg-blue-50',
            textColor: 'text-[#004a99]'
        },
        {
            label: 'Profile Status',
            value: 'Active',
            icon: CheckCircle2,
            color: 'bg-[#ff7a00]',
            accentColor: 'bg-white/10'
        },
    ];

    const mappedReviews = recentReviews.map(r => ({
        id: r.id,
        user: r.user?.fullName || 'Anonymous',
        location: r.business?.title || r.business?.name || 'Business',
        rating: r.rating,
        comment: r.comment,
        avatar: r.user?.avatarUrl
    }));

    const copyReferralLink = () => {
        if (!affiliateStats?.referralCode) return;
        const link = `${window.location.origin}/?ref=${affiliateStats.referralCode}`;
        navigator.clipboard.writeText(link);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleApplyReferral = async () => {
        if (!referralInput.trim()) return;
        setIsApplying(true);
        setApplyStatus(null);
        try {
            const result = await api.affiliate.applyReferral(referralInput.trim());
            setApplyStatus({ type: 'success', message: result.message });
            setReferralInput('');
            // Refresh affiliate stats
            const updatedStats = await api.affiliate.getStats();
            setAffiliateStats(updatedStats);
        } catch (error: any) {
            setApplyStatus({ type: 'error', message: error.message || 'Invalid referral code' });
        } finally {
            setIsApplying(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-600/20 rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="mt-6 text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Synchronizing Data...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Welcome Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12 pt-10"
            >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h3 className="text-[2.5rem] font-black text-[#131b2e] mb-4 tracking-tighter leading-tight">
                            Welcome back, <span className="text-[#004a99]">{user?.fullName?.split(' ')[0] || 'Member'}!</span>
                        </h3>
                        <p className="text-xl text-[#64748b] font-bold tracking-tight">
                            {isVendor ? "Here's the latest pulse of your business listings." : "Explore and manage your favorite local experiences."}
                        </p>
                    </div>
                    {((isVendor || isAdmin) ? features.canAddListing : false) && (
                        <Link href="/vendor/add-listing" className="btn-orbit-primary px-10 !py-5">
                            <Plus className="w-6 h-6" /> New Listing
                        </Link>
                    )}
                </div>
            </motion.div>

            {/* Active Subscription Status Banner */}
            {(isVendor || isAdmin) && activeSub && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-12 overflow-hidden  rounded-[15px] bg-[#131b2e] border border-[#2d3748] relative"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#004a99]/20 rounded-full blur-[100px] pointer-events-none" />
                    <div className="p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-[22px] flex items-center justify-center flex-shrink-0">
                                <BadgeCheck className="w-9 h-9 text-white" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-[#10b981] uppercase tracking-[0.25em] mb-2">
                                    Premium Status
                                </p>
                                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
                                    {activeSub.plan?.name} Member
                                </h2>
                                <p className="text-[#94a3b8] font-bold text-sm sm:text-base flex items-center gap-2.5">
                                    <Clock className="w-4 h-4 text-[#475569]" />
                                    {(() => {
                                        const end = new Date(activeSub.endDate);
                                        const days = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                                        if (days > 3000) {
                                            return <span className="text-[#10b981]">Lifetime Access Active</span>;
                                        }

                                        return (
                                            <span className={days <= 4 ? "text-[#ba1a1a]" : "text-[#10b981]"}>
                                                {days > 0 ? `Renewal in ${days} days` : 'Expired'} · {end.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </span>
                                        );
                                    })()}
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/vendor/subscription"
                            className="btn-orbit-ghost !bg-white/5 !border-white/10 !text-white px-8"
                        >
                            Manage Subscription
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </motion.div>
            )}

            {/* Stats Overview */}
            <div className="mb-14">
                <StatsGrid stats={isVendor || isAdmin ? vendorStats : userStats} />
            </div>

            <div className="grid lg:grid-cols-12 gap-10 items-start">
                {/* Left Column - 8/12 width */}
                <div className="lg:col-span-8 space-y-10">

                    {/* Job Leads Section */}
                    {(isVendor || isAdmin) ? (
                        features.showLeads && (
                            <div className="bg-white rounded-[24px] p-8 sm:p-10 border border-[#e2e8f0] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <VendorLeadsInbox />
                            </div>
                        )
                    ) : (
                        <div className="space-y-10">
                            {/* Upgrade to Vendor CTA */}
                            <div className="bg-gradient-to-br from-[#0B2244] to-[#1a3a70] rounded-[16px] p-8 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 border-2 border-orange-500/20">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black text-white mb-2">Own a Business?</h3>
                                    <p className="text-blue-200 font-bold max-w-md">
                                        Upgrade to a Business Account to list your services, track performance, and connect with your local community.
                                    </p>
                                </div>
                                <Link
                                    href="/register?role=vendor"
                                    className="btn-orbit-accent px-8"
                                >
                                    Add Business
                                </Link>
                            </div>

                            <div className="bg-white rounded-[24px] p-8 sm:p-10 border border-[#e2e8f0] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <MyInquiries />
                            </div>
                            <div className="bg-white rounded-[24px] p-8 sm:p-10 border border-[#e2e8f0] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <MyJobLeads />
                            </div>
                        </div>
                    )}

                    {/* Performance Insights (Vendor Only) */}
                    {(isVendor || isAdmin) && features.showAnalytics && (
                        <div className="space-y-6 mb-10">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                    <TrendingUp className="w-7 h-7 text-blue-600" />
                                    Performance Analytics
                                </h3>
                            </div>
                            <div className="bg-white rounded-[24px] p-8 sm:p-10 border border-[#e2e8f0] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <PerformanceChart
                                    stats={stats}
                                    data={performanceData}
                                    activeTab={performancePeriod}
                                    onTabChange={setPerformancePeriod}
                                    loading={performanceLoading}
                                />
                            </div>
                        </div>
                    )}

                    {/* Saved Businesses Section (Common) */}
                    {((isVendor || isAdmin) ? features.showSaved : true) && (
                        <section className="bg-white rounded-[24px] p-8 sm:p-10 border border-[#e2e8f0] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#fff1f2] rounded-[16px] flex items-center justify-center text-[#ba1a1a] shadow-inner border border-[#ba1a1a]/10">
                                        <Heart className="w-6 h-6 fill-current" />
                                    </div>
                                    <h3 className="text-2xl font-black text-[#131b2e] tracking-tight">My Saved Places</h3>
                                </div>
                                <Link href="/vendor/saved" className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 transition-all group/link">
                                    View Collection <ChevronRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                                </Link>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-6">
                                {savedBusinesses.length > 0 ? (
                                    savedBusinesses.slice(0, 4).map((biz) => (
                                        <Link key={biz.id} href={`/business/${biz.slug}`} className="flex items-center gap-5 p-4 rounded-[16px] bg-slate-50 border border-transparent hover:border-blue-500/20 hover:bg-white hover: transition-all group/item">
                                            <div className="w-16 h-16 rounded-[16px] overflow-hidden flex-shrink-0 shadow-md">
                                                <img src={getImageUrl((biz as any).coverImageUrl || (biz as any).images?.[0]) || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=400'} alt={biz.title} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <h4 className="font-black text-slate-900 truncate group-hover/item:text-blue-600 transition-colors">{biz.title}</h4>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                    <span className="truncate">{biz.category?.name || 'Local'}</span>
                                                    <span className="text-slate-200">•</span>
                                                    <span className="truncate">{biz.city || 'Location'}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-10 bg-slate-50 rounded-[16px] border border-dashed border-slate-200">
                                        <p className="text-slate-400 font-bold italic">You haven't saved any businesses yet.</p>
                                        <Link href="/search" className="inline-block mt-4 text-xs font-black text-blue-600 uppercase tracking-widest">Start Exploring</Link>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Followed Businesses Section */}
                    {((isVendor || isAdmin) ? features.showFollowing : true) && (
                        <section className="bg-white rounded-[24px] p-8 sm:p-10 border border-[#e2e8f0] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#f0f4ff] rounded-[16px] flex items-center justify-center text-[#004a99] shadow-inner border border-[#004a99]/10">
                                        <Bell className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-black text-[#131b2e] tracking-tight">Following</h3>
                                </div>
                                <Link href="/vendor/following" className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#64748b] hover:text-[#004a99] transition-all group/link">
                                    Manage Alerts <ChevronRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                                </Link>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-6">
                                {followedBusinesses.length > 0 ? (
                                    followedBusinesses.slice(0, 4).map((biz) => (
                                        <Link key={biz.id} href={`/business/${biz.slug}`} className="flex items-center gap-5 p-4 rounded-[20px] bg-[#faf8ff] border border-transparent hover:border-[#004a99]/20 hover:bg-white hover:shadow-xl transition-all group/item">
                                            <div className="w-16 h-16 rounded-[16px] overflow-hidden flex-shrink-0 shadow-md">
                                                <img src={getImageUrl((biz as any).coverImageUrl || (biz as any).images?.[0]) || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=400'} alt={biz.title} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <h4 className="font-black text-[#131b2e] truncate group-hover/item:text-[#004a99] transition-colors">{(biz as any).title}</h4>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-[#64748b] uppercase tracking-widest mt-1">
                                                    <span className="truncate">{biz.category?.name || 'Local'}</span>
                                                    <span className="text-slate-200">•</span>
                                                    <span className="truncate">{biz.city || 'Location'}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-10 bg-[#faf8ff] rounded-[24px] border border-dashed border-[#e2e8f0]">
                                        <p className="text-[#64748b] font-bold italic">You aren't following any businesses yet.</p>
                                        <Link href="/search" className="inline-block mt-4 text-xs font-black text-[#004a99] uppercase tracking-widest">Discover Now</Link>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}


                    {/* Pending Vendor CTA if no stats (Admin Only?) - Skipping for now to focus on User Dashboard */}
                </div>

                {/* Right Column - 4/12 width */}
                <div className="lg:col-span-4 space-y-10">
                    {/* User Notifications (User Only) */}
                    {!isVendor && !isAdmin && (
                        <div className="bg-white rounded-[16px] p-8 sm:p-10 border border-black  shadow-slate-200/20">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                    <Bell className="w-6 h-6 text-blue-600" />
                                    Alerts
                                </h3>
                                <Link href="/vendor/notifications" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600">See All</Link>
                            </div>
                            <div className="space-y-6">
                                {notifications.length > 0 ? (
                                    notifications.slice(0, 4).map((notif) => (
                                        <div key={notif.id} className="flex gap-4 group cursor-pointer">
                                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notif.isRead ? 'bg-slate-200' : 'bg-blue-600 animate-pulse'}`}></div>
                                            <div>
                                                <h4 className={`text-sm font-black mb-1 ${notif.isRead ? 'text-slate-600' : 'text-slate-900'}`}>{notif.title}</h4>
                                                <p className="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed">{notif.message}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-slate-300 font-bold italic text-sm">No new notifications</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <RecentReviews
                        reviews={mappedReviews}
                        loading={loading}
                        title={isVendor || isAdmin ? "Recent Reviews" : "My Recent Reviews"}
                    />

                    {isVendor && features.showDemand && (
                        <VendorHotDemandWidget insights={demandInsights} loading={loading} />
                    )}

                    {((isVendor || isAdmin) && features.showChat) && (
                        <section className="bg-white rounded-[24px] p-8 border border-[#e2e8f0] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#f0f4ff] rounded-[16px] flex items-center justify-center text-[#004a99] shadow-inner border border-[#004a99]/10">
                                        <MessageSquare className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[#131b2e] tracking-tight">Recent Chats</h3>
                                        <p className="text-[10px] text-[#64748b] font-bold uppercase tracking-[0.2em] mt-1">Direct Connect</p>
                                    </div>
                                </div>
                                <Link href="/vendor/chat" className="text-[10px] font-black uppercase tracking-[0.2em] text-[#64748b] hover:text-[#004a99] transition-all flex items-center gap-1.5">
                                    Inbox <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                            <div className="space-y-4">
                                {conversations.length > 0 ? (
                                    conversations.map((conv) => (
                                        <Link
                                            key={conv.id}
                                            href={`/vendor/chat?id=${conv.id}`}
                                            className="block p-4 rounded-[18px] bg-[#faf8ff] border border-transparent hover:border-[#004a99]/20 hover:bg-white hover:shadow-lg transition-all group"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-[#e2e8f0] overflow-hidden flex-shrink-0">
                                                        {isVendor ? (
                                                            conv.user?.avatarUrl ? (
                                                                <img src={getImageUrl(conv.user.avatarUrl) as string} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-[#f0f4ff] text-[#004a99] font-black text-xs">
                                                                    {(conv.user?.fullName?.[0] || 'U').toUpperCase()}
                                                                </div>
                                                            )
                                                        ) : (
                                                            conv.business?.logoUrl ? (
                                                                <img src={getImageUrl(conv.business.logoUrl) as string} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-[#fff7ed] text-[#ff7a00] font-black text-xs">
                                                                    {(conv.business?.title?.[0] || 'B').toUpperCase()}
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-[#131b2e] leading-none group-hover:text-[#004a99] transition-colors">
                                                            {isVendor ? (conv.user?.fullName || 'Client') : (conv.business?.title || 'Business')}
                                                        </p>
                                                        {isVendor && <p className="text-[10px] text-[#64748b] font-bold mt-1.5 uppercase tracking-tighter">On {conv.business?.title || 'Listing'}</p>}
                                                    </div>
                                                </div>
                                                <span className="text-[9px] text-[#94a3b8] font-black uppercase tracking-widest">{new Date(conv.lastMessageAt || conv.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-xs text-[#475569] font-medium line-clamp-1 mt-3 pl-1">
                                                {conv.lastMessage || 'Open thread...'}
                                            </p>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="py-10 text-center bg-[#faf8ff] rounded-[24px] border border-dashed border-[#e2e8f0]">
                                        <MessageSquare className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
                                        <p className="text-[#64748b] font-bold italic text-xs">No active conversations</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {isVendor && features.showQueries && (
                        <section className="bg-[#faf8ff] rounded-[24px] p-8 border border-[#e2e8f0] opacity-80 scale-95 origin-top grayscale-[0.2]">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center text-[#64748b] border border-[#e2e8f0]">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-lg font-black text-[#131b2e] tracking-tight">Form Enquiries</h3>
                                </div>
                                <Link href="/vendor/messages" className="text-[10px] font-black uppercase tracking-[0.2em] text-[#004a99] hover:text-[#ff7a00]">
                                    Lead Vault →
                                </Link>
                            </div>
                            <p className="text-[11px] text-[#64748b] font-bold text-center py-4 leading-relaxed italic">
                                Live Chat is the preferred channel. Older form queries are archived in your Lead Management Center.
                            </p>
                        </section>
                    )}

                    {/* Referral Section */}
                    {isVendor && (
                        <section className="bg-[#131b2e]  rounded-[15px] p-10 border border-[#2d3748] shadow-[0_30px_60px_rgb(0,0,0,0.25)] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#004a99]/10 rounded-full blur-[100px] pointer-events-none" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 bg-[#004a99]/30 rounded-[18px] flex items-center justify-center text-[#3b82f6] border border-[#3b82f6]/30 shadow-2xl">
                                            <Share2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white tracking-tight">Refer & Scale</h3>
                                            {/* <p className="text-[10px] font-black text-[#ff7a00] uppercase tracking-[0.3em] mt-1">Unlock Premium Rewards</p> */}
                                        </div>
                                    </div>
                                    <Link href="/vendor/affiliate" className="text-[10px] font-black uppercase tracking-[0.3em] text-[#94a3b8] hover:text-white transition-all flex items-center gap-2">
                                        Network Stats <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </div>

                                {/* Apply Referrer Section (If not referred) */}
                                {!affiliateStats?.hasReferrer && (
                                    <div className="mb-6 p-4 bg-blue-600/5 border border-blue-500/20 rounded-xl space-y-3">
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Were you referred by someone?</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={referralInput}
                                                onChange={(e) => setReferralInput(e.target.value)}
                                                placeholder="Enter Expert Code"
                                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                                            />
                                            <button
                                                onClick={handleApplyReferral}
                                                disabled={isApplying || !referralInput}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-black rounded-xl transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
                                            </button>
                                        </div>
                                        {applyStatus && (
                                            <p className={`text-[10px] font-bold ${applyStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {applyStatus.message}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {affiliateStats?.hasReferrer && (
                                    <div className="mb-6 px-4 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                            Referred by: <span className="text-white ml-1">{affiliateStats.referrerName || 'Community Expert'}</span>
                                        </p>
                                    </div>
                                )}

                                {affiliateStats?.isAffiliate ? (
                                    <div className="space-y-4">
                                        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="overflow-hidden">
                                                    <p className="text-[9px] font-black text-[#94a3b8] uppercase tracking-[0.2em] mb-1.5">Share Referral Link</p>
                                                    <p className="text-xs font-bold text-white truncate opacity-60">
                                                        {typeof window !== 'undefined' ? `${window.location.origin}/?ref=${affiliateStats.referralCode}` : 'Loading...'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={copyReferralLink}
                                                    className="flex-shrink-0 p-3.5 bg-[#004a99] hover:bg-[#003c7d] text-white rounded-xl transition-all active:scale-95 shadow-lg"
                                                >
                                                    {copySuccess ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5 px-1">
                                            <Gift className="w-4 h-4 text-[#ff7a00]" />
                                            <p className="text-[11px] text-[#94a3b8] font-bold leading-relaxed">
                                                Earn <span className="text-white font-black italic">1 month premium</span> for every vendor you refer!
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                            Invite other businesses to join and get rewarded with free subscription extensions.
                                        </p>
                                        <Link
                                            href="/vendor/affiliate"
                                            className="inline-flex items-center justify-center w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[14px] font-black text-sm transition-all active:scale-95 shadow-xl shadow-blue-900/20"
                                        >
                                            Join Referral Program
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
