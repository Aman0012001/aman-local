"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Menu, ChevronDown, MapPin, User as UserIcon, LogOut, X, Search, Building2, Globe, Bell, Check, Trash2, BellRing, Megaphone, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, getImageUrl } from '../lib/api';
import VendorAvatar from './VendorAvatar';
import { Category, City } from '../types/api';
import { usePushNotifications } from '../lib/usePushNotifications';
import { chatApi } from '../services/chat.service';

export default function Navbar() {
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    // ── Web Push Notifications ───────────────────────────────────────
    const { supported: pushSupported, permission: pushPermission, isSubscribed: pushSubscribed, subscribe: enablePush, loading: pushLoading } = usePushNotifications(user?.id, false);

    // ── Notifications ───────────────────────────────────────────────
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [showBell, setShowBell] = useState(false);
    const [activeSub, setActiveSub] = useState<any>(null);
    const [loadingSub, setLoadingSub] = useState(true);
    const bellRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const [notifRes, chatRes] = await Promise.all([
                api.notifications.getAll() as any,
                chatApi.getUnreadCount() as any
            ]);
            setNotifications(notifRes.notifications || []);
            setUnreadCount(notifRes.unreadCount || 0);
            setUnreadChatCount(chatRes.count || 0);
        } catch { /* ignore */ }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        
        const fetchSub = async () => {
            if (!user || user.role !== 'vendor') {
                setLoadingSub(false);
                return;
            }
            try {
                const sub = await api.subscriptions.getActive();
                setActiveSub(sub);
            } catch (err) {
                console.error('Failed to fetch active sub in navbar', err);
            } finally {
                setLoadingSub(false);
            }
        };

        fetchSub();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications, user]);

    // Close bell dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
                setShowBell(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleMarkRead = async (id: string) => {
        await api.notifications.markRead(id).catch(() => { });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleMarkAllRead = async () => {
        await api.notifications.markAllRead().catch(() => { });
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await api.notifications.delete(id).catch(() => { });
        setNotifications(prev => prev.filter(n => n.id !== id));
        setUnreadCount(prev => {
            const deleted = notifications.find(n => n.id === id);
            return deleted && !deleted.isRead ? Math.max(0, prev - 1) : prev;
        });
    };

    const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    };

    const typeColor: Record<string, string> = {
        new_listing: 'bg-blue-100 text-blue-600',
        enquiry_reply: 'bg-green-100 text-green-700',
        new_vendor: 'bg-purple-100 text-purple-700',
        info: 'bg-slate-100 text-slate-500',
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cats, cityData] = await Promise.all([
                    api.categories.getPopular(10),
                    api.cities.getPopular()
                ]);
                setCategories(cats.slice(0, 10));
                setCities(cityData.slice(0, 10));
            } catch (error) {
                console.error('Error fetching navbar data:', error);
            }
        };
        fetchData();
    }, []);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    return (
        <nav className="sticky top-0 z-50 bg-white/90 border-b border-slate-100/80 shadow-sm backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20 relative">

                    {/* Logo - Fixed Width Area */}
                    <div className="flex-shrink-0 w-48 flex items-center">
                        <Link href="/" className="flex items-center group overflow-hidden h-20">
                            <div className="h-28 w-48 relative transition-all duration-300 group-hover:scale-105">
                                <img
                                    src="/logo.png"
                                    alt="naampata logo"
                                    className="absolute inset-0 w-full h-full object-contain scale-[2.2]"
                                />
                            </div>
                        </Link>
                    </div>

                    {/* Centered Desktop Nav Menu */}
                    <div className="hidden lg:flex flex-grow justify-center absolute left-1/2 -translate-x-1/2 w-full max-w-2xl pointer-events-none">
                        <div className="flex items-center gap-2 pointer-events-auto">
                            <Link href="/" className="relative text-[#2D3E50] font-bold text-[15px] px-4 py-2 rounded-xl hover:bg-slate-50 transition-all hover:text-[#FF7A30]">
                                Home
                            </Link>

                            {/* Categories Dropdown */}
                            <div
                                className="relative group"
                                onMouseEnter={() => setActiveDropdown('categories')}
                                onMouseLeave={() => setActiveDropdown(null)}
                            >
                                <button className="flex items-center gap-1 text-[#2D3E50]/70 font-bold text-[15px] px-4 py-2 rounded-xl hover:bg-slate-50 hover:text-[#2D3E50] transition-all group">
                                    Categories <ChevronDown className={`w-4 h-4 opacity-40 group-hover:opacity-100 transition-all ${activeDropdown === 'categories' ? 'rotate-180' : ''}`} />
                                </button>

                                {activeDropdown === 'categories' && (
                                    <div className="absolute top-full left-0  w-64 animate-in fade-in slide-in-from-top-2 duration-200 " style={{ zIndex: "1000" }}>

                                        <div className="grid grid-cols-4 gap-6 p-4">
                                            {activeDropdown === 'categories' && (
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[700px] animate-in fade-in slide-in-from-top-2 duration-200">

                                                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6">

                                                        <div className="grid grid-cols-4 gap-6">

                                                            {categories.map((cat) => (
                                                                <Link
                                                                    key={cat.id}
                                                                    href={`/categories/${cat.slug}`}
                                                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all group"
                                                                >
                                                                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500">
                                                                        <Search className="w-4 h-4" />
                                                                    </div>

                                                                    <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                                                                        {cat.name}
                                                                    </span>
                                                                </Link>
                                                            ))}

                                                        </div>

                                                        <div className="border-t border-slate-100 mt-4 pt-3 text-center">
                                                            <Link
                                                                href="/categories"
                                                                className="text-xs font-bold uppercase tracking-widest text-[#FF7A30] hover:text-[#E86920]"
                                                            >
                                                                View All Categories
                                                            </Link>
                                                        </div>

                                                    </div>

                                                </div>
                                            )}
                                            {/* <Link href="/categories" className="mt-2 text-center py-2 text-xs font-bold uppercase tracking-widest text-[#FF7A30] hover:text-[#E86920] border-t border-slate-50 pt-3">
                                                    View All Categories
                                                </Link> */}
                                        </div>

                                    </div>
                                )}
                            </div>

                            {/* Businesses Dropdown */}
                            <div
                                className="relative group"
                                onMouseEnter={() => setActiveDropdown('businesses')}
                                onMouseLeave={() => setActiveDropdown(null)}
                            >
                                <button className="flex items-center gap-1 text-[#2D3E50]/70 font-bold text-[15px] px-4 py-2 rounded-xl hover:bg-slate-50 hover:text-[#2D3E50] transition-all group">
                                    Businesses <ChevronDown className={`w-4 h-4 opacity-40 group-hover:opacity-100 transition-all ${activeDropdown === 'businesses' ? 'rotate-180' : ''}`} />
                                </button>
                                <div className="absolute top-full left-0  w-64 animate-in fade-in slide-in-from-top-2 duration-200 " style={{ zIndex: "1000" }}>

                                    <div className="grid grid-cols-4 gap-6 p-4"></div>
                                    {activeDropdown === 'businesses' && (
                                        <div className="absolute  top-full left-1/2 -translate-x-1/2 pt-2 w-64 animate-in fade-in slide-in-from-top-2 duration-200" >
                                            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-2">
                                                <div className="grid grid-cols-1 gap-6 ">
                                                    <Link href="/search?filter=featured" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all group/item">
                                                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-[#FF7A30]">
                                                            <Building2 className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-900">Featured</span>
                                                            <span className="text-[10px] text-slate-400 font-medium italic">Hand-picked best locals</span>
                                                        </div>
                                                    </Link>
                                                    <Link href="/search?filter=new" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all group/item">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                                            <Search className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-900">Newly Added</span>
                                                            <span className="text-[10px] text-slate-400 font-medium italic">Fresh arrivals this week</span>
                                                        </div>
                                                    </Link>
                                                    <Link href="/offers-events" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all group/item">
                                                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                                                            <Megaphone className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-900">Offer & Events</span>
                                                            <span className="text-[10px] text-slate-400 font-medium italic">Best deals & local events</span>
                                                        </div>
                                                    </Link>
                                                    <Link href="/broadcasts" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all group/item">
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                            <Megaphone className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-900">Broadcast Request</span>
                                                            <span className="text-[10px] text-slate-400 font-medium italic">Get quotes from experts</span>
                                                        </div>
                                                    </Link>
                                                    <Link href="/search" className="mt-2 text-center py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 border-t border-slate-50 pt-3">
                                                        Advanced Search
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cities Dropdown */}
                            <div
                                className="relative group"
                                onMouseEnter={() => setActiveDropdown('cities')}
                                onMouseLeave={() => setActiveDropdown(null)}
                            >
                                <button className="flex items-center gap-1 text-[#2D3E50]/70 font-bold text-[15px] px-4 py-2 rounded-xl hover:bg-slate-50 hover:text-[#2D3E50] transition-all group">
                                    Cities <ChevronDown className={`w-4 h-4 opacity-40 group-hover:opacity-100 transition-all ${activeDropdown === 'cities' ? 'rotate-180' : ''}`} />
                                </button>
                                <div className="absolute top-full left-0  w-64 animate-in fade-in slide-in-from-top-2 duration-200 " style={{ zIndex: "1000" }}>

                                    <div className="grid grid-cols-4 gap-6 p-4"></div>
                                    {activeDropdown === 'cities' && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[700px] animate-in fade-in slide-in-from-top-2 duration-200">

                                            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6">

                                                <div className="grid grid-cols-4 gap-8">

                                                    {cities.map((city) => (
                                                        <Link
                                                            key={city.id}
                                                            href={`/cities/${encodeURIComponent(city.name.toLowerCase())}`}
                                                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all group"
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                                                                <Globe className="w-4 h-4" />
                                                            </div>

                                                            <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                                                                {city.name}
                                                            </span>
                                                        </Link>
                                                    ))}

                                                </div>

                                                <div className="border-t border-slate-100 mt-4 pt-3 text-center">
                                                    <Link
                                                        href="/cities"
                                                        className="text-xs font-bold uppercase tracking-widest text-[#FF7A30] hover:text-[#E86920]"
                                                    >
                                                        Browse All Cities
                                                    </Link>
                                                </div>

                                            </div>

                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Auth Actions - Fixed Width Area */}
                    <div className="flex items-center justify-end gap-3 w-48 lg:w-auto">
                        {user ? (
                            <div className="flex items-center gap-3">
                                <Link href={user.role === 'admin' || user.role === 'superadmin' ? '/admin' : '/vendor/dashboard'} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-all cursor-pointer group">
                                    <VendorAvatar 
                                        src={user.avatarUrl} 
                                        alt={user.fullName || user.email} 
                                        size="sm" 
                                        className="shadow-sm group-hover:scale-110 transition-transform"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-[#112D4E] leading-tight max-w-[80px] truncate">{user.fullName || user.email}</span>
                                        <span className="text-[8px] text-orange-600 font-bold uppercase tracking-widest">
                                            {user.role === 'admin' || user.role === 'superadmin' ? 'Admin Dash' : 'Dashboard'}
                                        </span>
                                    </div>
                                </Link>

                                {/* 🔕 Enable Push Notifications button – only shown if not yet granted */}
                                {pushSupported && !pushSubscribed && pushPermission === 'default' && (
                                    <button
                                        onClick={enablePush}
                                        disabled={pushLoading}
                                        title="Enable push notifications"
                                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-60"
                                    >
                                        <BellRing className={`w-3.5 h-3.5 ${pushLoading ? 'animate-bounce' : ''}`} />
                                        {pushLoading ? 'Enabling…' : 'Enable Push'}
                                    </button>
                                )}

                                {user && (user.role === 'admin' || user.role === 'superadmin' || (activeSub?.plan?.dashboardFeatures?.showChat !== false)) && (
                                    <Link
                                        href="/vendor/chat"
                                        className={`relative p-2.5 rounded-xl text-slate-500 hover:text-[#FF7A30] hover:bg-orange-50 transition-all ${loadingSub && user.role === 'vendor' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                        title="Messages"
                                    >
                                        <MessageSquare className="w-5 h-5" />
                                        {unreadChatCount > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                                                {unreadChatCount > 9 ? '9+' : unreadChatCount}
                                            </span>
                                        )}
                                    </Link>
                                )}

                                {/* 🔔 Notification Bell */}
                                <div ref={bellRef} className="relative">
                                    <button
                                        onClick={() => setShowBell(v => !v)}
                                        className="relative p-2.5 rounded-xl text-slate-500 hover:text-[#FF7A30] hover:bg-orange-50 transition-all"
                                        title="Notifications"
                                    >
                                        <Bell className="w-5 h-5" />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#FF7A30] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    {showBell && (
                                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                                            {/* Header */}
                                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                                <span className="font-bold text-slate-900 text-sm">Notifications</span>
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={handleMarkAllRead}
                                                        className="text-[11px] font-bold text-[#FF7A30] hover:text-[#E86920] flex items-center gap-1 transition-colors"
                                                    >
                                                        <Check className="w-3 h-3" /> Mark all read
                                                    </button>
                                                )}
                                            </div>

                                            {/* List */}
                                            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                                                {notifications.length === 0 ? (
                                                    <div className="py-10 text-center">
                                                        <Bell className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                                                        <p className="text-sm text-slate-400 font-medium">No notifications yet</p>
                                                    </div>
                                                ) : (
                                                    notifications.slice(0, 10).map(n => (
                                                        <div
                                                            key={n.id}
                                                            onClick={() => { if (!n.isRead) handleMarkRead(n.id); }}
                                                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors group ${n.isRead ? 'opacity-60' : 'bg-orange-50/30'
                                                                }`}
                                                        >
                                                            {/* Dot */}
                                                            <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.isRead ? 'bg-slate-200' : 'bg-[#FF7A30]'
                                                                }`} />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${typeColor[n.type] || typeColor.info
                                                                        }`}>
                                                                        {n.type?.replace(/_/g, ' ')}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 font-medium ml-auto">{timeAgo(n.createdAt)}</span>
                                                                </div>
                                                                <p className="text-xs font-bold text-slate-900 leading-snug">{n.title}</p>
                                                                <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-2">{n.message}</p>
                                                            </div>
                                                            <button
                                                                onClick={e => handleDelete(e, n.id)}
                                                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 hover:text-red-500 transition-all text-slate-300 flex-shrink-0"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {/* Footer */}
                                            <div className="border-t border-slate-100 px-4 py-2.5">
                                                <Link
                                                    href="/vendor/notifications"
                                                    onClick={() => setShowBell(false)}
                                                    className="text-[11px] font-bold text-[#FF7A30] hover:text-[#E86920] transition-colors"
                                                >
                                                    View all notifications →
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={logout}
                                    className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                    title="Logout"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="hidden sm:flex items-center gap-2">
                                <Link
                                    href="/login"
                                    className="btn-orbit-ghost"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/register?role=vendor"
                                    className="btn-orbit-accent whitespace-nowrap"
                                >
                                    Add Business
                                </Link>
                            </div>
                        )}

                        <button
                            onClick={toggleMobileMenu}
                            className="lg:hidden p-2.5 bg-slate-50 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>

                </div>
            </div>

            {/* Mobile Menu Drawer */}
            <div className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 pointer-events-none ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}>
                <div className={`absolute top-20 left-0 right-0 bg-white border-b border-slate-100 shadow-2xl transition-all duration-300 pointer-events-auto ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
                    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-5rem)]">
                        <div className="grid grid-cols-1 gap-4">
                            <Link href="/" className="p-4 rounded-2xl bg-slate-50 text-center font-bold text-slate-900 border border-transparent active:border-slate-200">Home</Link>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 px-2">Browse Deeply</h3>
                            <div className="space-y-2">
                                <Link href="/categories" className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 font-bold text-slate-700">
                                    Categories <ChevronDown className="w-4 h-4 opacity-40" />
                                </Link>
                                <Link href="/search" className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 font-bold text-slate-700">
                                    Businesses <ChevronDown className="w-4 h-4 opacity-40" />
                                </Link>
                                <Link href="/cities" className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 font-bold text-slate-700">
                                    Cities <ChevronDown className="w-4 h-4 opacity-40" />
                                </Link>
                            </div>
                        </div>

                        {!user && (
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <Link href="/login" className="btn-orbit-ghost w-full">Log In</Link>
                                <Link href="/register?role=vendor" className="btn-orbit-accent w-full">Add Your Business</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
