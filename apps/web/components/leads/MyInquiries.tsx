'use client';

import React, { useState, useEffect } from 'react';
import { api, getImageUrl } from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Clock, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function MyInquiries() {
    const [inquiries, setInquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyInquiries();
    }, []);

    const fetchMyInquiries = async () => {
        try {
            setLoading(true);
            const response = await api.leads.getMyEnquiries();
            setInquiries(response.data || []);
        } catch (err: any) {
            console.error('Failed to fetch my inquiries', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-[#004a99] animate-spin" />
            <p className="text-[#64748b] font-black uppercase tracking-[0.2em] text-[10px]">Retrieving Communications</p>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#f0f4ff] rounded-[16px] flex items-center justify-center text-[#004a99] shadow-inner border border-[#004a99]/10">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-[#131b2e] tracking-tight">Inquiries & Claims</h2>
                        <p className="text-[10px] text-[#64748b] font-bold uppercase tracking-[0.2em] mt-1">Your outgoing business pulse</p>
                    </div>
                </div>
            </div>

            {inquiries.length === 0 ? (
                <div className="bg-[#faf8ff] p-12  rounded-[15px] border border-dashed border-[#e2e8f0] text-center">
                    <p className="text-[#64748b] font-bold italic text-sm">No recent inquiries or claims yet.</p>
                </div>
            ) : (
                <div className="grid gap-5">
                    {inquiries.slice(0, 5).map((inq, idx) => (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={inq.id}
                            className="bg-white p-6 rounded-[24px] border border-[#e2e8f0] hover:border-[#004a99]/20 hover:shadow-[0_15px_40px_rgb(0,0,0,0.05)] transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-[16px] bg-[#faf8ff] overflow-hidden flex-shrink-0 shadow-sm border border-[#e2e8f0]">
                                        <img
                                            src={getImageUrl(inq.business?.logoUrl || inq.business?.images?.[0]) || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                                            alt={inq.business?.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-[#131b2e] text-lg leading-tight group-hover:text-[#004a99] transition-colors">{inq.business?.title || 'Local Business'}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] text-[#94a3b8] font-black uppercase tracking-[0.15em] px-2 py-0.5 bg-[#faf8ff] rounded-md border border-[#e2e8f0]">
                                                {inq.type === 'whatsapp' ? 'Offer Claim' : 'Inquiry'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${inq.status === 'new' ? 'bg-[#f0f4ff] text-[#004a99] border border-[#004a99]/10' : 'bg-[#faf8ff] text-[#64748b] border border-[#e2e8f0]'
                                    }`}>
                                    {inq.status}
                                </div>
                            </div>

                            <p className="text-sm text-[#475569] font-medium line-clamp-2 mb-6 pl-1 leading-relaxed">
                                {inq.message}
                            </p>

                            <div className="flex items-center justify-between pt-5 border-t border-[#f1f5f9]">
                                <div className="flex items-center gap-2 text-[10px] text-[#94a3b8] font-bold">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatDistanceToNow(new Date(inq.createdAt), { addSuffix: true })}
                                </div>
                                <Link
                                    href={`/business/${inq.business?.slug}`}
                                    className="text-[10px] font-black uppercase tracking-[0.2em] text-[#004a99] flex items-center gap-1.5 group-hover:gap-3 transition-all"
                                >
                                    Listing Profile <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                    {inquiries.length > 5 && (
                        <Link href="/vendor/messages" className="text-center py-4 text-[10px] font-black text-[#64748b] hover:text-[#004a99] uppercase tracking-[0.3em] transition-all pt-4">
                            Communications Archive
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
