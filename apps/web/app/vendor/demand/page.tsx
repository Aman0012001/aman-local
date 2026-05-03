"use client";

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { TrendingUp, Activity, MapPin, Loader2, BarChart2, Lock } from 'lucide-react';
import Link from 'next/link';

export default function VendorDemandPage() {
    const { user } = useAuth();
    const [insights, setInsights] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

    const activeSub = user?.vendor?.subscriptions?.find((sub: any) => sub.status === 'active');
    const features = activeSub?.plan?.dashboardFeatures || {};
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    const isVendor = user?.role === 'vendor';

    useEffect(() => {
        // Try to get actual location, fallback to a default if blocked or failing
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setLocation(coords);
                    fetchDemand(coords.lat, coords.lng);
                },
                (err) => {
                    // GeolocationPositionError doesn't stringify well, log the message
                    console.warn("Geolocation access denied or unavailable. Using default location (NYC).", err.message || err);
                    
                    // Fallback to default coordinates for demo
                    const defaultCoords = { lat: 40.7128, lng: -74.0060 }; // NYC
                    setLocation(defaultCoords);
                    fetchDemand(defaultCoords.lat, defaultCoords.lng);
                }
            );
        } else {
            // Default coordinates
            const defaultCoords = { lat: 40.7128, lng: -74.0060 };
            setLocation(defaultCoords);
            fetchDemand(defaultCoords.lat, defaultCoords.lng);
        }
    }, []);

    const fetchDemand = async (lat: number, lng: number) => {
        setLoading(true);
        try {
            const data = await api.demand.getNearby(lat, lng);
            setInsights(data || []);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch demand insights.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium animate-pulse">Analyzing local market data...</p>
            </div>
        );
    }

    // Hot Demand Insights unlocked for all vendors as per user request.

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-blue-600 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="font-bold tracking-tight">Market Intelligence</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                    Nearby Demand
                </h1>
                <p className="text-slate-500 text-lg max-w-2xl leading-relaxed">
                    Discover what customers are searching for in your local area right now. Use these insights to tailor your offers and services.
                </p>
            </div>

            {error ? (
                <div className="p-8 bg-red-50 border border-red-100 rounded-3xl text-center">
                    <p className="text-red-600 font-medium">{error}</p>
                    <button
                        onClick={() => location && fetchDemand(location.lat, location.lng)}
                        className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
                    >
                        Retry Analysis
                    </button>
                </div>
            ) : insights.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm text-center px-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Activity className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No strong trends right now</h3>
                    <p className="text-slate-500 max-w-md">
                        There isn't a significant volume of local searches in your immediate area to show trending data. Check back later!
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <BarChart2 className="w-6 h-6 text-blue-600" />
                            Trending Categories & Keywords
                        </h2>
                        {location && (
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-200">
                                <MapPin className="w-4 h-4 text-[#FF7A30]" />
                                Local Area Focus
                            </div>
                        )}
                    </div>

                    <div className="divide-y divide-slate-100">
                        {insights.map((insight, idx) => (
                            <div key={insight.keyword} className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center hover:bg-blue-50/30 transition-colors">
                                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 font-black text-lg shrink-0">
                                    #{idx + 1}
                                </div>

                                <div className="flex-grow">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-xl font-bold text-slate-900 capitalize">
                                            {insight.keyword}
                                        </h3>
                                        {insight.isTrending && (
                                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-black rounded-full uppercase tracking-widest flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3" /> Hot Trend
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-500">
                                        <span className="flex items-center gap-1"><Activity className="w-4 h-4" /> Activity Score: {insight.score}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className={insight.growth > 0 ? 'text-green-600' : 'text-slate-500'}>
                                            {insight.growth > 0 ? '+' : ''}{insight.growth}% growth
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0 w-full md:w-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="text-center">
                                        <div className="text-sm font-bold text-slate-900">{insight.count1h}</div>
                                        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Last 1h</div>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200" />
                                    <div className="text-center">
                                        <div className="text-sm font-bold text-slate-900">{insight.count6h}</div>
                                        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Last 6h</div>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200" />
                                    <div className="text-center">
                                        <div className="text-sm font-bold text-slate-900">{insight.count24h}</div>
                                        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Last 24h</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
