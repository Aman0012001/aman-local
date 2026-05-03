"use client";

import React from 'react';
import Link from 'next/link';
import { Star, MapPin, ShieldCheck, Clock, CheckCircle2, Users, Heart } from 'lucide-react';
import { Business } from '../types/api';
import { getImageUrl } from '../lib/api';
import { getBusinessOpenStatus } from '../lib/business-status';
import ChatTrigger from './chat/ChatTrigger';
// Simple Online/Offline badge — green when vendor is logged in, red when not
const VendorOnlineBadge = ({ isOnline }: { isOnline?: boolean }) => {
    if (isOnline) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Offline
        </span>
    );
};

// Open / Closed badge based on business hours
// Falls back to vendor.businessHours (Record) if listing.businessHours (Array) is empty
const BusinessOpenBadge = ({ business }: { business: Business }) => {
    const hoursData = (business.businessHours && business.businessHours.length > 0)
        ? business.businessHours
        : business.vendor?.businessHours;

    const { status, label, todayHours } = getBusinessOpenStatus(hoursData);
    if (status === 'UNKNOWN') return null;

    const isOpen = status === 'OPEN';
    return (
        <span
            title={todayHours ? `Today: ${todayHours}` : undefined}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${isOpen
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
        >
            <Clock className="w-3 h-3" />
            {todayHours ? `${todayHours} (${label})` : label}
        </span>
    );
};

const StatusBadge = ({ status }: { status?: string }) => {
    if (!status || status === 'approved') {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Approved
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending
        </span>
    );
};

interface BusinessCardProps {
    business: Business;
    variant?: 'green' | 'blue' | 'white' | 'dark' | 'minimal';
    layout?: 'grid' | 'list';
    showChat?: boolean;
}

export default function BusinessCard({ business, variant = 'blue', layout = 'grid', showChat = true }: BusinessCardProps) {
    const getButtonStyles = () => {
        switch (variant) {
            case 'green':
                return 'bg-[#00B67A] hover:bg-[#009665] text-white';
            case 'blue':
                return 'bg-[#3C82F6] hover:bg-[#2563EB] text-white';
            case 'white':
                return 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50';
            case 'dark':
                return 'bg-[#112D4E] hover:bg-black text-white';
            case 'minimal':
                return 'bg-slate-900 hover:bg-blue-600 text-white';
            default:
                return 'bg-[#3C82F6] hover:bg-[#2563EB] text-white';
        }
    };

    const getButtonText = () => {
        return variant === 'green' ? 'Call Now' : 'View Details';
    };

    if (variant === 'minimal') {
        const isList = layout === 'list';
        return (
            <Link href={`/business/${business.slug}`} className={`group block ${isList ? 'w-full' : ''}`}>
                <div className={`flex ${isList ? 'flex-row gap-8 items-center' : 'flex-col gap-6'} transition-all duration-700`}>
                    {/* Minimalist Image container */}
                    <div className={`relative overflow-hidden rounded-[20px] bg-slate-50 border border-slate-100/50 ${isList ? 'w-64 h-48 shrink-0' : 'aspect-[4/3] w-full'}`}>
                        <img
                            src={getImageUrl(business.coverImageUrl) || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800'}
                            alt={business.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s] grayscale-[0.2] group-hover:grayscale-0"
                        />
                    </div>

                    {/* Minimalist Content */}
                    <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                                {business.category?.name || 'Selection'}
                            </span>
                            <div className="h-px w-4 bg-slate-200" />
                            <StatusBadge status={(business as any).status} />
                            <div className="h-px w-4 bg-slate-200" />
                            <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                                <Star className="w-3.5 h-3.5 fill-slate-900" />
                                {business.averageRating || '4.5'}
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors mb-2 tracking-tight">
                            {business.title}.
                        </h3>

                        <p className="text-slate-400 text-sm font-bold leading-relaxed mb-6 line-clamp-2 max-w-lg">
                            {business.shortDescription || business.description || 'Premium listing with exceptional service quality and local commitment.'}
                        </p>

                        <div className="flex items-center gap-4 text-xs font-black text-slate-900 uppercase tracking-widest group-hover:gap-6 transition-all">
                            Explore Details
                            <div className="w-8 h-[2px] bg-slate-100 group-hover:bg-blue-600 group-hover:w-16 transition-all duration-500" />
                        </div>
                    </div>

                    {/* Removed Enquire button from minimal variant as per request */}
                </div>
            </Link>
        );
    }

    if (layout === 'list') {
        return (
            <Link href={`/business/${business.slug}`} className="group block">
                <div className="bg-white rounded-2xl border border-black overflow-hidden hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 flex flex-col md:flex-row h-full md:h-64">
                    {/* Image Container */}
                    <div className="relative w-full md:w-80 h-48 md:h-full overflow-hidden">
                        <img
                            src={getImageUrl(business.coverImageUrl) || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800'}
                            alt={business.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                    </div>

                    {/* Content */}
                    <div className="p-8 flex flex-col flex-grow">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                        {business.title}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <StatusBadge status={(business as any).status} />
                                </div>
                                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                    <MapPin className="w-4 h-4 text-blue-600" />
                                    {business.address}, {business.city}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full text-amber-600 font-bold border border-amber-100">
                                    <Star className="w-4 h-4 fill-amber-500" />
                                    <span>{business.averageRating || '4.5'}</span>
                                    <span className="text-xs text-amber-400 font-medium">({business.totalReviews || 0})</span>
                                </div>
                                {business.followersCount !== undefined && business.followersCount > 0 && (
                                    <div className="flex items-center gap-1.5 bg-violet-50 px-3 py-1 rounded-full text-violet-600 font-bold border border-violet-100 mt-2">
                                        <Users className="w-3.5 h-3.5" />
                                        <span className="text-xs">{business.followersCount} followers</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <p className="text-slate-500 text-sm line-clamp-2 mb-6 leading-relaxed">
                            {business.shortDescription || business.description}
                        </p>

                        <div className="mt-auto flex items-center justify-between gap-6">
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold border border-slate-100 uppercase tracking-widest">
                                    {business.category?.name || 'Service'}
                                </div>
                                <VendorOnlineBadge isOnline={business.vendor?.user?.isOnline} />
                                <BusinessOpenBadge business={business} />
                            </div>
                            <div className={`px-10 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${getButtonStyles()}`}>
                                {getButtonText()}
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link href={`/business/${business.slug}`} className="group h-full">
            <div className="bg-white rounded-[16px] border border-slate-200 overflow-hidden flex flex-col h-full hover:shadow-lg transition-all duration-300">
                {/* Image Container */}
                <div className="relative h-48 w-full overflow-hidden">
                    <img
                        src={getImageUrl(business.coverImageUrl) || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800'}
                        alt={business.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-xl font-medium text-[#0000cc] line-clamp-1 mb-4">
                        {business.title}
                    </h3>

                    {/* Badges */}
                    <div className="flex items-center gap-3 mb-5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-[#e8f8f0] text-[#00B67A]">
                            <CheckCircle2 className="w-4 h-4" /> Approved
                        </span>
                        
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                            business.vendor?.user?.isOnline 
                                ? 'bg-[#e8f8f0] text-[#00B67A]' 
                                : 'bg-[#fff0f0] text-[#ff3333]'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${business.vendor?.user?.isOnline ? 'bg-[#00B67A]' : 'bg-[#ff3333]'}`} />
                            {business.vendor?.user?.isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-slate-600 font-medium text-base">
                            {business.averageRating ? Number(business.averageRating).toFixed(1) : '5.0'}
                        </span>
                        <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 text-[#ffc107] fill-[#ffc107]" />
                            ))}
                        </div>
                    </div>

                    {/* View Details Button */}
                    <div className="mt-auto">
                        <div className="w-full py-2.5 rounded-lg border border-slate-200 bg-white text-[#112d4e] text-sm font-medium text-center hover:bg-slate-50 transition-colors">
                            View Details
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
