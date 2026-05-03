'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Phone, Mail, MessageSquare, Globe, Clock, ChevronRight, User, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Lead {
    id: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    type: 'call' | 'whatsapp' | 'email' | 'chat' | 'website';
    status: 'new' | 'contacted' | 'converted' | 'lost';
    createdAt: string;
}

const TYPE_CONFIG = {
    call: { icon: Phone, color: 'text-[#004a99]', bg: 'bg-[#f0f4ff]' },
    whatsapp: { icon: MessageSquare, color: 'text-[#10b981]', bg: 'bg-[#ecfdf5]' },
    email: { icon: Mail, color: 'text-[#004a99]', bg: 'bg-[#f0f4ff]' },
    chat: { icon: MessageSquare, color: 'text-[#ff7a00]', bg: 'bg-[#fff7ed]' },
    website: { icon: Globe, color: 'text-[#64748b]', bg: 'bg-[#faf8ff]' },
};

export default function VendorLeadsInbox() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchRecentLeads();
    }, []);

    const fetchRecentLeads = async () => {
        try {
            setLoading(true);
            const response = await api.leads.getForVendor({ limit: 5 });
            setLeads(response.data || []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch leads');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative">
                    <Loader2 className="w-10 h-10 text-[#004a99] animate-spin" />
                    <div className="absolute inset-0 bg-[#004a99]/10 rounded-full blur-xl animate-pulse"></div>
                </div>
                <p className="text-[#64748b] font-black text-[10px] uppercase tracking-[0.2em]">Syncing Latest Leads</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-10 bg-[#fff1f2]  rounded-[15px] border border-[#fecaca] text-center">
                <AlertCircle className="w-12 h-12 text-[#ba1a1a] mx-auto mb-4" />
                <p className="text-[#131b2e] font-black tracking-tight mb-4">{error}</p>
                <button
                    onClick={fetchRecentLeads}
                    className="px-6 py-3 bg-white border border-[#fecaca] rounded-2xl text-sm font-black text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white transition-all shadow-sm active:scale-95"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (leads.length === 0) {
        return (
            <div className="p-12 bg-[#faf8ff]  rounded-[15px] border border-dashed border-[#e2e8f0] text-center">
                <div className="w-16 h-16 bg-white text-[#e2e8f0] rounded-[20px] flex items-center justify-center mx-auto mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <User className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-[#131b2e] mb-2 tracking-tight">No Leads Yet</h3>
                <p className="text-[#64748b] text-sm font-bold mb-8">List your services and connect with customers to see leads here.</p>
                <Link href="/vendor/add-listing" className="inline-flex items-center gap-2.5 px-8 py-4 bg-[#004a99] text-white rounded-[20px] text-sm font-black shadow-[0_15px_30px_rgb(0,74,153,0.15)] hover:scale-105 active:scale-95 transition-all">
                    Create Listing
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#f0f4ff] rounded-[16px] flex items-center justify-center text-[#004a99] shadow-inner border border-[#004a99]/10">
                        <Phone className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-[#131b2e] tracking-tight">Recent Leads</h3>
                        <p className="text-[10px] text-[#64748b] font-bold uppercase tracking-[0.2em] leading-none mt-1">Direct Business Pulse</p>
                    </div>
                </div>
                <button
                    onClick={fetchRecentLeads}
                    className="p-3 text-[#94a3b8] hover:text-[#004a99] hover:bg-[#f0f4ff] rounded-xl transition-all active:scale-95"
                    title="Refresh Leads"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-4">
                {leads.map((lead, idx) => {
                    const Config = TYPE_CONFIG[lead.type] || TYPE_CONFIG.website;
                    const Icon = Config.icon;

                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={lead.id}
                        >
                            <Link
                                href="/vendor/leads"
                                className="group flex items-center gap-5 p-5 bg-[#faf8ff] hover:bg-white rounded-[24px] border border-transparent hover:border-[#e2e8f0] transition-all active:scale-[0.98] hover:shadow-[0_20px_50px_rgb(0,0,0,0.06)]"
                            >
                                <div className={`w-14 h-14 ${Config.bg} ${Config.color} rounded-[20px] flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:scale-110 shadow-sm border border-transparent group-hover:border-current/10`}>
                                    <Icon className="w-7 h-7" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <h4 className="font-black text-[#131b2e] truncate tracking-tight text-lg leading-tight">{lead.name || 'Anonymous Client'}</h4>
                                        <span className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest flex items-center gap-1.5 flex-shrink-0">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(lead.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-[#64748b] font-bold truncate group-hover:text-[#131b2e] transition-colors">
                                        {lead.message || 'Customer is interested in your listing...'}
                                    </p>
                                </div>

                                <div className="w-10 h-10 rounded-[14px] bg-white border border-[#e2e8f0] flex items-center justify-center text-[#94a3b8] group-hover:text-[#004a99] group-hover:border-[#004a99]/20 group-hover:shadow-md transition-all flex-shrink-0">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}

                <Link
                    href="/vendor/leads"
                    className="flex items-center justify-center gap-3 p-5 text-[11px] font-black text-[#64748b] hover:text-[#004a99] uppercase tracking-[0.25em] transition-all group pt-4"
                >
                    Lead Management Center
                    <div className="w-8 h-8 bg-[#faf8ff] rounded-xl flex items-center justify-center group-hover:bg-[#004a99] group-hover:text-white transition-all shadow-sm">
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                </Link>
            </div>
        </div>
    );
}
