"use client";

import React from 'react';
import {
    ListTree,
    Heart,
    MessageSquare,
    Star
} from 'lucide-react';

interface StatItem {
    label: string;
    value: string | number;
    icon: any;
    color: string;
    textColor?: string;
    accentColor?: string;
    shadow?: string;
    onClick?: () => void;
}

interface StatsGridProps {
    stats?: StatItem[];
}

const defaultStats = [
    {
        label: 'Total Listings',
        value: '124',
        icon: ListTree,
        color: 'bg-white',
        textColor: 'text-[#004a99]',
        accentColor: 'bg-[#f0f4ff]'
    },
    {
        label: 'Saved Businesses',
        value: '850',
        icon: Heart,
        color: 'bg-[#004a99]',
        textColor: 'text-white',
        accentColor: 'bg-white/10'
    },
    {
        label: 'New Messages',
        value: '12',
        icon: MessageSquare,
        color: 'bg-white',
        textColor: 'text-[#ff7a00]',
        accentColor: 'bg-[#fff4e6]'
    },
    {
        label: 'New Reviews',
        value: '48',
        icon: Star,
        color: 'bg-white',
        textColor: 'text-[#10b981]',
        accentColor: 'bg-emerald-50'
    },
];

export default function StatsGrid({ stats = defaultStats }: StatsGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {stats.map((stat) => {
                const isDarkBg = stat.color.includes('bg-slate-900') || stat.color.includes('bg-[#004a99]') || stat.color.includes('bg-emerald-500') || stat.color.includes('bg-amber-500') || stat.color.includes('bg-gradient');
                const defaultTextColor = isDarkBg ? 'text-white' : 'text-[#131b2e]';
                const textColor = stat.textColor || defaultTextColor;
                const labelColor = textColor === 'text-white' ? 'text-white/70' : 'text-[#64748b]';

                return (
                    <div
                        key={stat.label}
                        onClick={stat.onClick}
                        className={`${stat.color} ${stat.shadow || 'shadow-[0_8px_30px_rgb(0,0,0,0.04)]'} rounded-[24px] p-8 border border-[#e5e7eb] flex flex-col gap-4 group hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 ${stat.onClick ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                    >
                        <div className={`w-14 h-14 ${stat.accentColor || 'bg-black/5'} rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:rotate-6`}>
                            <stat.icon className={`w-7 h-7 ${textColor}`} />
                        </div>
                        <div>
                            <p className={`text-[11px] font-black uppercase tracking-[0.1em] mb-1 ${labelColor}`}>
                                {stat.label}
                            </p>
                            <h4 className={`text-4xl font-black tracking-tight ${textColor}`}>
                                {stat.value}
                            </h4>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
