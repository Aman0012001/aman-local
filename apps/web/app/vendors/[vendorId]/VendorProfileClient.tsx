"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
    BadgeCheck, Star, Mail, Phone, MapPin,
    Calendar, Building2, Globe, ArrowLeft,
    TrendingUp, Award, Clock, Search, Filter,
    Tag, Gift, Ticket, ChevronRight, Check,
    MessageSquare, Share2, ShieldCheck, Heart, MessageCircle, Send
} from 'lucide-react';
import { api, getImageUrl } from '../../../lib/api';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import VendorAvatar from '../../../components/VendorAvatar';
import ChatTrigger from '../../../components/chat/ChatTrigger';

interface VendorProfile {
    id: string;
    businessName: string;
    vendorName: string;
    businessEmail?: string;
    businessPhone?: string;
    businessAddress?: string;
    isVerified: boolean;
    socialLinks: { platform: string; url: string; }[];
    avatarUrl: string | null;
    bio?: string;
    listingCount: number;
    avgRating: number;
    totalViews: number;
    categories: string[];
    createdAt?: string;
    listings: any[];
    offers?: any[];
    events?: any[];
    businessHours?: any[];
    latitude?: number;
    longitude?: number;
}

export default function VendorProfileClient({ vendorId }: { vendorId: string }) {
    const [vendor, setVendor] = useState<VendorProfile | null>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const [profileData, reviewsData] = await Promise.all([
                    api.vendors.getPublicProfile(vendorId),
                    api.reviews.getByVendor(vendorId)
                ]);
                setVendor(profileData);
                setReviews(reviewsData.data || []);
            } catch (err: any) {
                console.error('[VendorProfile] Failed to load data:', err);
                setError(err.message || 'Failed to load vendor profile');
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, [vendorId]);

    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const sortedHours = useMemo(() => {
        const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        if (!vendor?.businessHours || vendor.businessHours.length === 0) return [];
        
        return [...vendor.businessHours].sort((a, b) => {
            return daysOrder.indexOf(a.dayOfWeek.toLowerCase()) - daysOrder.indexOf(b.dayOfWeek.toLowerCase());
        });
    }, [vendor?.businessHours]);

    const businessStatus = useMemo(() => {
        if (!vendor?.businessHours || vendor.businessHours.length === 0) return null;
        
        const now = new Date();
        const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const today = vendor.businessHours.find(h => h.dayOfWeek.toLowerCase() === day);
        
        if (!today || !today.isOpen) return { isOpen: false, label: 'Closed Now' };
        
        const [h1, m1] = (today.openTime || '09:00').split(':').map(Number);
        const [h2, m2] = (today.closeTime || '18:00').split(':').map(Number);
        
        const start = h1 * 60 + m1;
        const end = h2 * 60 + m2;
        const current = now.getHours() * 60 + now.getMinutes();
        
        const isOpen = current >= start && current <= end;
        return { isOpen, label: isOpen ? 'Open Now' : 'Closed Now' };
    }, [vendor?.businessHours]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <Navbar />
                <div className="flex flex-col items-center justify-center h-[60vh]">
                    <div className="w-12 h-12 border-4 border-[#00346f] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-slate-400 font-bold animate-pulse text-sm uppercase tracking-widest">Loading Expert Profile...</p>
                </div>
            </div>
        );
    }

    if (error || !vendor) {
        return (
            <div className="min-h-screen bg-white">
                <Navbar />
                <div className="max-w-xl mx-auto mt-20 p-8 bg-white rounded-3xl border border-slate-100 text-center shadow-sm">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Building2 className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-2">Profile Not Found</h1>
                    <p className="text-slate-500 mb-8">{error || 'We couldn\'t find the profile you were looking for.'}</p>
                    <Link href="/search" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all">
                        <ArrowLeft className="w-5 h-5" /> Back to Search
                    </Link>
                </div>
            </div>
        );
    }

    const memberSince = vendor.createdAt ? new Date(vendor.createdAt).getFullYear() : new Date().getFullYear();


    return (
        <div className="min-h-screen bg-white font-sans text-slate-900">
            <Navbar />

            {/* Main Container */}
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

                {/* Header Profile Section */}
                <header className="bg-white rounded-[10px] border border-[#c4c6d0] p-6 lg:p-8 mb-8 shadow-sm">
                    <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-[#d7e2ff] shadow-md">
                                <img
                                    src={vendor.avatarUrl ? getImageUrl(vendor.avatarUrl) as string : '/default-avatar.png'}
                                    alt={vendor.businessName}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            {vendor.isVerified && (
                                <div className="absolute bottom-2 right-2 bg-[#00346f] text-white p-2 rounded-full shadow-lg border-2 border-white">
                                    <BadgeCheck className="w-5 h-5" />
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center lg:text-left">
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-3">
                                <h1 className="text-3xl lg:text-4xl font-black text-[#00346f] tracking-tight">{vendor.businessName}</h1>
                                {vendor.isVerified && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#00346f]/5 text-[#00346f] rounded-full border border-[#00346f]/20">
                                        <ShieldCheck className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Verified Expert</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-[#44474e] font-medium mb-6">
                                <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1 rounded-full border border-orange-100">
                                    <Star className="w-4 h-4 fill-orange-500 text-orange-500" />
                                    <span className="font-bold">{vendor.avgRating} ({reviews.length} Reviews)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-[#00346f]" />
                                    <span>{vendor.businessAddress || 'Location available on request'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-[#00346f]" />
                                    <span>Serving since {memberSince}</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                                <a 
                                    href={`tel:${vendor.businessPhone}`}
                                    className="px-8 py-3 bg-[#00346f] text-white font-black rounded-[10px] hover:bg-[#00346f]/90 transition-all shadow-md active:scale-95 flex items-center gap-2"
                                >
                                    <Phone className="w-4 h-4" /> Call Now
                                </a>
                                <button 
                                    onClick={() => {
                                        const phone = vendor.businessPhone?.replace(/\D/g, '');
                                        if (phone) window.open(`https://wa.me/${phone}`, '_blank');
                                    }}
                                    className="px-8 py-3 bg-white text-[#00346f] font-black rounded-[10px] border-2 border-[#00346f] hover:bg-[#00346f]/5 transition-all flex items-center gap-2"
                                >
                                    <MessageSquare className="w-4 h-4" /> Message
                                </button>
                                <button 
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({
                                                title: vendor.businessName,
                                                text: vendor.bio,
                                                url: window.location.href
                                            });
                                        } else {
                                            navigator.clipboard.writeText(window.location.href);
                                            alert('Link copied to clipboard!');
                                        }
                                    }}
                                    className="p-3 bg-[#e2e2e6] text-[#1a1c1e] rounded-[10px] hover:bg-[#e2e2e6]/80 transition-all"
                                >
                                    <Share2 className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={async () => {
                                        if (!vendor.listings?.[0]) return;
                                        try {
                                            await api.users.addFavorite(vendor.listings[0].id);
                                            alert('Added to favorites!');
                                        } catch (err) {
                                            console.error('Failed to favorite:', err);
                                        }
                                    }}
                                    className="p-3 bg-[#e2e2e6] text-[#1a1c1e] rounded-[10px] hover:bg-[#e2e2e6]/80 transition-all group active:scale-95"
                                >
                                    <Heart className="w-5 h-5 group-hover:fill-red-500 group-hover:text-red-500 transition-colors" />
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* About Us */}
                        <section className="bg-white rounded-[10px] border border-[#c4c6d0] p-6 lg:p-8 shadow-sm">
                            <h2 className="text-2xl font-black text-[#00346f] mb-6 flex items-center gap-3">
                                <Building2 className="w-6 h-6" /> About Us
                            </h2>
                            <p className="text-[#44474e] leading-relaxed text-lg whitespace-pre-wrap">
                                {vendor.bio || `${vendor.businessName} is a top-rated professional serving the community with dedication and expertise. We specialize in providing high-quality solutions tailored to your specific needs.`}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-[#c4c6d0]">
                                {[
                                    { label: 'Total Views', value: vendor.totalViews, icon: TrendingUp },
                                    { label: 'Active Listings', value: vendor.listingCount, icon: Tag },
                                    { label: 'Awards Won', value: '12+', icon: Award },
                                    { label: 'Success Rate', value: '99%', icon: ShieldCheck },
                                ].map((stat, i) => (
                                    <div key={i} className="text-center">
                                        <div className="w-10 h-10 bg-[#00346f]/5 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <stat.icon className="w-5 h-5 text-[#00346f]" />
                                        </div>
                                        <div className="text-xl font-black text-[#00346f] leading-tight">{stat.value}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Core Services */}
                        <section className="bg-white rounded-[10px] border border-[#c4c6d0] p-6 lg:p-8 shadow-sm">
                            <h2 className="text-2xl font-black text-[#00346f] mb-6 flex items-center gap-3">
                                <Globe className="w-6 h-6" /> Our Core categories
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {vendor.categories.map((cat, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 bg-[#f3f3f7] rounded-[10px] border border-[#c4c6d0]/30 hover:border-[#00346f]/30 transition-all group">
                                        <div className="w-12 h-12 bg-white rounded-[10px] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                            <Tag className="w-6 h-6 text-[#00346f]" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-[#00346f] text-lg leading-tight">{cat}</h4>
                                            <p className="text-xs text-[#44474e] font-medium">Expert professional service</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Active Listings */}
                        <section id="listings" className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-black text-[#00346f] flex items-center gap-3">
                                    <Tag className="w-6 h-6" /> Active Services
                                </h2>
                                <span className="px-4 py-1 bg-[#00346f] text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                                    {vendor.listings.length} Results
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {vendor.listings.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all group p-4"
                                    >
                                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-6">
                                            <img 
                                                src={item.images?.[0] ? getImageUrl(item.images[0]) as string : '/placeholder.jpg'} 
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                        <div className="px-2 pb-2">
                                            <h3 className="text-2xl font-black text-[#00346f] mb-4">{item.title}</h3>
                                            
                                            <div className="flex flex-wrap gap-3 mb-6">
                                                <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-sm font-bold">
                                                    <BadgeCheck className="w-4 h-4" />
                                                    <span>Approved</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-500 rounded-full border border-red-100 text-sm font-bold">
                                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                                    <span>Offline</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 mb-8">
                                                <span className="text-xl font-black text-slate-700">{Number(item.averageRating || 5.0).toFixed(1)}</span>
                                                <div className="flex items-center gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                                    ))}
                                                </div>
                                            </div>

                                            <Link 
                                                href={`/business/${item.slug}`}
                                                className="block w-full py-3 px-6 text-center border border-slate-200 text-[#00346f] font-bold rounded-xl hover:bg-[#00346f] hover:text-white transition-all text-lg"
                                            >
                                                View Details
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Offers & Events */}
                        {(vendor.offers?.length || 0) > 0 && (
                            <section className="bg-[#00346f] rounded-[10px] p-6 lg:p-8 text-white">
                                <div className="flex items-center gap-3 mb-8">
                                    <Gift className="w-8 h-8" />
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight">Exclusive Offers</h2>
                                        <p className="text-sm opacity-80 font-medium">Limited time deals from {vendor.businessName}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {vendor.offers?.map((offer: any) => (
                                        <div key={offer.id} className="bg-white/10 backdrop-blur-md rounded-[10px] p-6 border border-white/20 hover:bg-white/15 transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="px-3 py-1 bg-white text-[#00346f] text-[10px] font-black uppercase tracking-widest rounded-full">
                                                    {offer.offerBadge || 'DISCOUNT'}
                                                </div>
                                                {offer.expiryDate && (
                                                    <div className="text-[10px] font-bold opacity-60 flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3" /> EXPIRES: {new Date(offer.expiryDate).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-black mb-2">{offer.title}</h3>
                                            <p className="text-sm opacity-80 mb-6 line-clamp-2">{offer.description}</p>
                                            <button className="w-full py-3 bg-white text-[#00346f] font-black rounded-[10px] hover:bg-white/90 transition-all text-sm uppercase tracking-widest">
                                                Claim Offer
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                    </div>

                    {/* Right Column - Sticky Sidebar */}
                    <aside className="lg:col-span-4 space-y-8">
                        <div className="sticky top-24 space-y-8">

                             {/* Booking Card */}
                             <div className="bg-[#0b1224] rounded-[10px] p-6 lg:p-8 text-white shadow-2xl">
                                 <h3 className="text-xl font-black mb-8">Connect with Business</h3>
 
                                 <div className="space-y-4">
                                     {/* Call Now Button */}
                                     <a 
                                         href={`tel:${vendor.businessPhone}`}
                                         className="w-full py-4 bg-white text-slate-900 font-black rounded-[10px] hover:bg-slate-100 transition-all flex items-center justify-center gap-3 text-base shadow-sm"
                                     >
                                         <Phone className="w-5 h-5" /> Call Now
                                     </a>
 
                                     {/* WhatsApp Express Button */}
                                     <a 
                                         href={`https://wa.me/${vendor.businessPhone?.replace(/\D/g, '')}`}
                                         target="_blank"
                                         rel="noopener noreferrer"
                                         className="w-full py-4 bg-[#25d366] text-white font-black rounded-[10px] hover:bg-[#22c35e] transition-all flex items-center justify-center gap-3 text-base shadow-lg shadow-emerald-500/20"
                                     >
                                         <MessageSquare className="w-5 h-5" /> WhatsApp Express
                                     </a>
 
                                     {/* Secondary Chat Button */}
                                     {vendor.listings?.[0] && (
                                         <ChatTrigger
                                             businessId={vendor.listings[0].id}
                                             businessName={vendor.businessName}
                                             variant="full"
                                             className="!w-full !py-4 !bg-[#0f172a]/50 !border !border-white/5 !text-white !rounded-[10px] !font-black !text-sm !uppercase !tracking-widest !flex !items-center !justify-center !gap-3 hover:!bg-[#0f172a]/80"
                                             icon={<MessageCircle className="w-5 h-5" />}
                                             label="CHAT"
                                         />
                                     )}
 
                                     {/* Chat Now & Enquire Button (Gradient) */}
                                     {vendor.listings?.[0] && (
                                         <ChatTrigger
                                             businessId={vendor.listings[0].id}
                                             businessName={vendor.businessName}
                                             variant="full"
                                             className="!w-full !py-4 !bg-gradient-to-r !from-[#8b5cf6] !to-[#3b82f6] !text-white !rounded-[10px] !font-black !text-base !border-none !shadow-xl !shadow-indigo-500/20 !flex !items-center !justify-center !gap-3"
                                             icon={<Send className="w-5 h-5" />}
                                             label="Chat Now & Enquire"
                                         />
                                     )}
                                 </div>
 
                                 {/* Card Footer */}
                                 <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                                     <div className="flex items-center gap-2 text-slate-400 text-sm">
                                         <Globe className="w-4 h-4" />
                                         <span>Website</span>
                                     </div>
                                     <a 
                                         href={vendor.socialLinks?.find(l => l.platform.toLowerCase() === 'website')?.url || '#'} 
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         className="text-white text-sm font-black underline underline-offset-4 decoration-2 decoration-[#3b82f6] hover:text-[#3b82f6] transition-colors"
                                     >
                                         Visit Site
                                     </a>
                                 </div>
                             </div>

                             {/* Business Hours */}
                             <div className="bg-white rounded-[10px] border border-[#c4c6d0] p-6 lg:p-8 shadow-sm">
                                 <div className="flex items-center justify-between mb-6">
                                     <h3 className="text-xl font-black text-[#00346f] flex items-center gap-3">
                                         <Clock className="w-5 h-5" /> Business Hours
                                     </h3>
                                     {businessStatus && (
                                         <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${businessStatus.isOpen ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                                             {businessStatus.label}
                                         </div>
                                     )}
                                 </div>
                                 <div className="space-y-4">
                                     {(sortedHours.length > 0 ? sortedHours : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => ({ dayOfWeek: d, isOpen: true, openTime: '09:00', closeTime: '18:00' }))).map((hour: any, i: number) => {
                                         const isToday = hour.dayOfWeek.toLowerCase() === currentDay.toLowerCase();
                                         return (
                                             <div key={i} className={`flex justify-between items-center py-2 border-b border-[#c4c6d0]/30 last:border-0 ${isToday ? 'bg-blue-50/50 -mx-4 px-4 rounded-lg' : ''}`}>
                                                 <span className={`font-black text-sm uppercase tracking-widest ${isToday ? 'text-[#00346f]' : 'text-slate-500'}`}>
                                                     {hour.dayOfWeek}
                                                     {isToday && <span className="ml-2 text-[8px] bg-[#00346f] text-white px-1.5 py-0.5 rounded-full">Today</span>}
                                                 </span>
                                                 <span className={`text-xs font-black ${hour.isOpen ? 'text-emerald-600' : 'text-red-500'} uppercase tracking-widest`}>
                                                     {hour.isOpen ? `${hour.openTime?.substring(0, 5)} - ${hour.closeTime?.substring(0, 5)}` : 'Closed'}
                                                 </span>
                                             </div>
                                         );
                                     })}
                                 </div>
                             </div>


                        </div>
                    </aside>
                </div>
            </div>

            <Footer />
        </div>
    );
}
