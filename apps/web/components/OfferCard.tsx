'use client';

import React from 'react';
import { Megaphone, Calendar, Tag, Clock } from 'lucide-react';
import Link from 'next/link';
import ChatTrigger from './chat/ChatTrigger';

interface OfferCardProps {
    offer: {
        id: string;
        title: string;
        description?: string;
        type: 'offer' | 'event';
        offerBadge?: string;
        imageUrl?: string;
        expiryDate?: string;
        business?: {
            id: string;
            title: string;
            slug: string;
        };
        isFeatured?: boolean;
    };
    onEnquire?: () => void;
}

const OfferCard: React.FC<OfferCardProps> = ({ offer, onEnquire }) => {
    return (
        <div className={`group relative bg-white rounded-3xl border shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 overflow-hidden flex flex-col h-full ${offer.isFeatured ? 'border-orange-200 ring-2 ring-orange-500/10' : 'border-slate-100'}`}>
            {offer.isFeatured && (
                <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-slate-900 border border-white/20 text-white text-[10px] font-black rounded-xl shadow-xl flex items-center gap-1.5 uppercase tracking-widest">
                    <Megaphone className="w-3 h-3 text-orange-400" />
                    Featured
                </div>
            )}
            {/* Offer Banner Image */}
            {offer.imageUrl ? (
                <div className="h-40 overflow-hidden bg-slate-100">
                    <img
                        src={offer.imageUrl}
                        alt={offer.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                </div>
            ) : (
                <div className={`h-1.5 w-full ${offer.type === 'event' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-orange-500 to-rose-500'}`} />
            )}

            <div className="p-6 flex flex-col flex-1 gap-3">
                {/* Header info (Badge and Type) */}
                <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${offer.type === 'event' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                        {offer.type === 'event' ? <Calendar className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                        {offer.type}
                    </span>

                    {offer.offerBadge && (
                        <span className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-black rounded-xl shadow-sm shadow-orange-500/30 uppercase tracking-wider">
                            {offer.offerBadge}
                        </span>
                    )}
                </div>

                {/* Business name link (if provided) */}
                {offer.business && (
                    <Link
                        href={`/business/${offer.business.slug}`}
                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-orange-500 transition-colors"
                    >
                        {offer.business.title}
                    </Link>
                )
                }

                <h3 className="font-black text-slate-900 text-lg leading-tight group-hover:text-orange-500 transition-colors">{offer.title}</h3>

                {offer.description && (
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{offer.description}</p>
                )}

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    {offer.expiryDate ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Valid until</span> {new Date(offer.expiryDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                        </div>
                    ) : (
                        <div />
                    )}

                    {offer.business ? (
                        <ChatTrigger
                            businessId={offer.business.id}
                            businessName={offer.business.title}
                            label="Enquire"
                            className="!bg-slate-900 !text-white hover:!bg-orange-500 !px-5 !h-[36px] !rounded-[12px] !text-xs border-none"
                        />
                    ) : (
                        <button
                            onClick={onEnquire}
                            className="btn-orbit-ghost !bg-slate-900 !text-white hover:!bg-orange-500 !px-5 !h-[36px] !rounded-[12px] !text-xs"
                        >
                            Enquire
                        </button>
                    )}
                </div>
            </div>
        </div >
    );
};

export default OfferCard;
