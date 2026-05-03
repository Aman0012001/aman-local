"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import { Business, Category, City } from '@/types/api';
import BusinessCard from '@/components/BusinessCard';
import OfferCard from '@/components/OfferCard';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';
import { LayoutGrid, List, Filter, ChevronRight, Star, ShieldCheck, Search, MapPin, Activity, Navigation, Loader2, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function CategoryDetailClient({ categorySlug }: { categorySlug: string }) {
    const router = useRouter();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [category, setCategory] = useState<Category | null>(null);
    const [cities, setCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortBy, setSortBy] = useState<string>('relevance');
    const [categoryOffers, setCategoryOffers] = useState<any[]>([]);
    const [offersLoading, setOffersLoading] = useState(false);
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [radius, setRadius] = useState<number>(10);
    const [geoLoading, setGeoLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        city: '',
        state: '',
        area: '',
        minRating: 0,
        minReviews: 0,
        verifiedOnly: false,
        featuredOnly: false,
        openNow: false,
        amenities: [] as string[],
        page: 1
    });
    const [totalResults, setTotalResults] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [amenities, setAmenities] = useState<any[]>([]);

    // Dynamically derive provinces from cities data
    const provinces = useMemo(() => {
        const uniqueStates = new Set(cities.map(c => c.state).filter(Boolean));
        return Array.from(uniqueStates).sort();
    }, [cities]);

    const areaInputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const resultsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [citiesData, amenitiesData] = await Promise.all([
                    api.cities.getAll(),
                    api.listings.getAmenities()
                ]);
                setCities(citiesData || []);
                setAmenities(amenitiesData || []);
            } catch (err) {
                console.error('Failed to load filter data:', err);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        const loadCategoryData = async () => {
            let actualSlug = categorySlug;

            // Handle SPA fallback where the page is served by a 'template' HTML file
            if ((categorySlug === 'template' || categorySlug === 'general') && typeof window !== 'undefined') {
                const pathParts = window.location.pathname.split('/').filter(Boolean);
                // URL structure: /categories/slug/ or /categories/slug
                if (pathParts[0] === 'categories' && pathParts[1] && pathParts[1] !== 'template') {
                    actualSlug = pathParts[1];
                    console.log('[CategoryDetail] Fallback detected, using actual slug from URL:', actualSlug);
                }
            }

            if (!actualSlug) return;
            const normalizedSlug = (actualSlug as string).toLowerCase();
            setLoading(true);

            try {
                const catData = await api.categories.getBySlug(normalizedSlug);
                setCategory(catData);

                const searchParams = {
                    categoryId: catData.id,
                    limit: 50,
                    sortBy: sortBy === 'relevance' ? undefined : sortBy,
                    city: filters.city,
                    minRating: filters.minRating || undefined,
                    verifiedOnly: filters.verifiedOnly,
                    featuredOnly: filters.featuredOnly,
                    openNow: filters.openNow,
                    state: filters.state || undefined,
                    area: filters.area || undefined,
                    minReviews: filters.minReviews || undefined,
                    amenityIds: filters.amenities.length > 0 ? filters.amenities.join(',') : undefined,
                    latitude: latitude || undefined,
                    longitude: longitude || undefined,
                    radius: latitude ? radius : undefined,
                    page: filters.page
                };
                const searchRes = await api.listings.search(searchParams);
                setBusinesses(searchRes.data);
                setTotalResults(searchRes.meta.total);
                setTotalPages(searchRes.meta.totalPages);

                // Scroll to results when page changes
                if (resultsRef.current && filters.page > 1) {
                    const yOffset = -100;
                    const y = resultsRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }

                // Load category offers
                try {
                    setOffersLoading(true);
                    const offersRes = await api.offers.search({
                        categoryId: catData.id,
                        placement: 'category',
                        limit: 20
                    });
                    setCategoryOffers(offersRes.data);
                } catch (err) {
                    console.error('Failed to load category offers:', err);
                } finally {
                    setOffersLoading(false);
                }
            } catch (err: any) {
                console.error('[CategoryDetail] Fetch error:', err);
                setError(err.message || 'Failed to fetch data');
            } finally {
                setLoading(false);
            }
        };
        loadCategoryData();
    }, [categorySlug, filters, sortBy, latitude, longitude, radius]);

    // Initialize Google Places Autocomplete for Area input
    useEffect(() => {
        if (!mapReady || !areaInputRef.current || !window.google?.maps?.places) return;

        autocompleteRef.current = new google.maps.places.Autocomplete(areaInputRef.current, {
            types: ['geocode'],
            componentRestrictions: { country: 'pk' } 
        });

        autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current?.getPlace();
            if (place && place.formatted_address) {
                const areaName = place.name || place.formatted_address.split(',')[0];
                setFilters(prev => ({ ...prev, area: areaName, page: 1 }));
            }
        });

        return () => {
            if (window.google?.maps?.event) {
                window.google.maps.event.clearInstanceListeners(areaInputRef.current!);
            }
        };
    }, [mapReady]);

    useEffect(() => {
        const checkGoogle = () => {
            const win = window as any;
            if (win.google?.maps?.places) {
                setMapReady(true);
                return true;
            }
            return false;
        };

        if (checkGoogle()) return;

        const interval = setInterval(() => {
            if (checkGoogle()) {
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !category) {
        return (
            <div className="min-h-screen bg-white">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 py-32 flex flex-col items-center">
                    <div className="w-12 h-12 border-t-2 border-blue-600 rounded-full animate-spin mb-6" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Collections</p>
                </div>
                <Footer />
            </div>
        );
    }

    if (!category && !loading) {
        return (
            <div className="min-h-screen bg-white">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 py-32 text-center">
                    <h1 className="text-6xl font-black text-slate-900 mb-6 tracking-tighter">Not Found.</h1>
                    <p className="text-slate-400 font-bold mb-10">This category collection does not exist.</p>
                    <Link href="/categories" className="text-blue-600 font-black uppercase tracking-widest text-xs border-b-2 border-blue-600 pb-1">Return to Index</Link>
                </div>
                <Footer />
            </div>
        );
    }

    if (!category) return null;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            <Navbar />

            <main className="flex-grow max-w-7xl mx-auto px-4 w-full pt-28 pb-20">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 mb-8 px-1">
                    <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                    <ChevronRight className="w-3 h-3" />
                    <Link href="/categories" className="hover:text-blue-600 transition-colors">Categories</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-900">{category.name}</span>
                </nav>

                <div className="flex flex-col lg:flex-row justify-between items-start md:items-end gap-6 mb-10 px-1">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-[#1e293b] tracking-tighter mb-3">
                            {totalResults} results for <span className="text-blue-600">'{category?.name || 'Businesses'}'</span> {filters.city && <>in <span className="text-blue-600">{filters.city}</span></>}
                        </h1>
                        <p className="text-slate-500 font-bold text-lg tracking-tight">
                            Showing top rated professional {category.name.toLowerCase()} {filters.city ? `near ${filters.city}` : 'in your area'}
                        </p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm min-w-[200px]">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sort by:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none font-black text-xs text-slate-900 cursor-pointer"
                            >
                                <option value="relevance">Recommended</option>
                                <option value="most_reviewed">Most Reviews</option>
                                <option value="rating">Highest Rated</option>
                                <option value="distance">Distance</option>
                                <option value="newest">Newly Added</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div ref={resultsRef} className="flex flex-col lg:grid lg:grid-cols-12 gap-10 items-start">
                    {/* Filters Sidebar */}
                    <aside className="lg:col-span-3 w-full sticky top-28">
                        <div className="bg-white  rounded-[15px] border border-slate-200 p-8 shadow-sm space-y-10">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#1e293b]">Filters</h3>
                                <button
                                    onClick={() => setFilters({ city: '', state: '', area: '', minRating: 0, minReviews: 0, verifiedOnly: false, featuredOnly: false, openNow: false, amenities: [], page: 1 })}
                                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                                >
                                    Clear All
                                </button>
                            </div>

                            {/* Location Filter */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" /> Location
                                </h4>
                                <div className="space-y-4">
                                    <select
                                        value="Pakistan"
                                        disabled
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 outline-none transition-all appearance-none cursor-not-allowed opacity-60"
                                    >
                                        <option value="Pakistan">Pakistan</option>
                                    </select>

                                    <select
                                        value={filters.state}
                                        onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value, city: '', area: '', page: 1 }))}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">All Provinces</option>
                                        {provinces.map(p => (
                                            <option key={p} value={p || ''}>{p}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={filters.city}
                                        onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value, page: 1 }))}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">All Cities</option>
                                        {cities
                                            .filter(c => !filters.state || c.state === filters.state)
                                            .map(city => (
                                                <option key={city.id} value={city.name}>{city.name}</option>
                                            ))}
                                    </select>

                                    <div className="relative group">
                                        <input
                                            ref={areaInputRef}
                                            type="text"
                                            placeholder="Area / Locality..."
                                            value={filters.area}
                                            onChange={(e) => setFilters(prev => ({ ...prev, area: e.target.value, page: 1 }))}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 transition-all"
                                        />
                                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                </div>
                            </div>

                            {/* Distance Filter */}
                            <div className="space-y-6 pt-4 border-t border-slate-50">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Navigation className="w-3.5 h-3.5" /> Distance
                                    </h4>
                                    {latitude && <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{radius || 10} km</span>}
                                </div>

                                {!latitude ? (
                                    <button
                                        onClick={() => {
                                            setGeoLoading(true);
                                            navigator.geolocation.getCurrentPosition(
                                                (pos) => {
                                                    setLatitude(pos.coords.latitude);
                                                    setLongitude(pos.coords.longitude);
                                                    setGeoLoading(false);
                                                },
                                                () => setGeoLoading(false)
                                            );
                                        }}
                                        disabled={geoLoading}
                                        className="w-full py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-blue-50 hover:border-blue-100 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                                        Detect Location
                                    </button>
                                ) : (
                                    <div className="space-y-4">
                                        <input
                                            type="range"
                                            min="1"
                                            max="50"
                                            value={radius || 10}
                                            onChange={(e) => setRadius(Number(e.target.value))}
                                            className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Ratings & Reviews Filter */}
                            <div className="space-y-6 pt-4 border-t border-slate-50">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Star className="w-3.5 h-3.5" /> Ratings & Reviews
                                </h4>
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        {[4.5, 4, 3].map(rating => (
                                            <label key={rating} className="flex items-center group cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-slate-200 text-blue-600 focus:ring-blue-500/10 cursor-pointer"
                                                    checked={filters.minRating === rating}
                                                    onChange={() => setFilters(prev => ({ ...prev, minRating: prev.minRating === rating ? 0 : rating }))}
                                                />
                                                <div className="ml-3 flex items-center gap-1">
                                                    <span className="text-xs font-bold text-slate-600">{rating}+</span>
                                                    <div className="flex">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className={`w-3 h-3 ${i < Math.floor(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="pt-2">
                                        <select
                                            value={filters.minReviews}
                                            onChange={(e) => setFilters(prev => ({ ...prev, minReviews: Number(e.target.value) }))}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="0">Any Number of Reviews</option>
                                            <option value="10">10+ Reviews</option>
                                            <option value="50">50+ Reviews</option>
                                            <option value="100">100+ Reviews</option>
                                            <option value="500">500+ Reviews</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Amenities / Services Filter */}
                            <div className="space-y-6 pt-4 border-t border-slate-50">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sliders className="w-3.5 h-3.5" /> Services & Facilities
                                </h4>
                                <div className="grid grid-cols-1 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {amenities.map(amenity => (
                                        <label key={amenity.id} className="flex items-center group cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-slate-200 text-blue-600 focus:ring-blue-500/10 cursor-pointer"
                                                checked={filters.amenities.includes(amenity.id)}
                                                onChange={(e) => {
                                                    const newAmenities = e.target.checked
                                                        ? [...filters.amenities, amenity.id]
                                                        : filters.amenities.filter(id => id !== amenity.id);
                                                    setFilters(prev => ({ ...prev, amenities: newAmenities }));
                                                }}
                                            />
                                            <span className="ml-3 text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{amenity.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* More Options */}
                            <div className="space-y-4 pt-4 border-t border-slate-50">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-xs font-bold text-slate-500 group-hover:text-[#1e293b] transition-colors">Open Now</span>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filters.openNow}
                                            onChange={() => setFilters(prev => ({ ...prev, openNow: !prev.openNow }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </div>
                                </label>

                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-xs font-bold text-slate-500 group-hover:text-[#1e293b] transition-colors">Verified Only</span>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filters.verifiedOnly}
                                            onChange={() => setFilters(prev => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </div>
                                </label>

                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-xs font-bold text-slate-500 group-hover:text-[#1e293b] transition-colors">Recommended</span>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filters.featuredOnly}
                                            onChange={() => setFilters(prev => ({ ...prev, featuredOnly: !prev.featuredOnly }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </div>
                                </label>
                            </div>

                        </div>
                    </aside>

                    {/* Results Area */}
                    <div className="lg:col-span-9 w-full">
                        {loading ? (
                            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {Array(6).fill(0).map((_, i) => (
                                    <div key={i} className="bg-white  rounded-[15px] border border-slate-100 p-6 space-y-6">
                                        <div className="aspect-[4/3] bg-slate-50 rounded-2xl animate-pulse" />
                                        <div className="space-y-3">
                                            <div className="h-4 bg-slate-50 w-1/3 rounded animate-pulse" />
                                            <div className="h-8 bg-slate-50 w-2/3 rounded animate-pulse" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : businesses.length > 0 ? (
                            <>
                                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                                    {businesses.map(biz => (
                                        <BusinessCard
                                            key={biz.id}
                                            business={biz}
                                            variant="white"
                                        />
                                    ))}
                                </div>

                                {totalPages > 1 && (
                                    <div className="mt-16 flex justify-center items-center gap-3">
                                        <button
                                            disabled={filters.page <= 1}
                                            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                                            className={`w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center transition-all ${filters.page <= 1 ? 'opacity-30 cursor-not-allowed' : 'bg-white text-slate-400 hover:text-blue-600 hover:border-blue-200'}`}
                                        >
                                            <ChevronRight className="w-5 h-5 rotate-180" />
                                        </button>

                                        <div className="flex items-center gap-2">
                                            {[...Array(totalPages)].map((_, i) => {
                                                const pageNum = i + 1;
                                                if (
                                                    pageNum === 1 ||
                                                    pageNum === totalPages ||
                                                    (pageNum >= filters.page - 1 && pageNum <= filters.page + 1)
                                                ) {
                                                    return (
                                                        <button
                                                            key={pageNum}
                                                            onClick={() => setFilters(prev => ({ ...prev, page: pageNum }))}
                                                            className={`w-12 h-12 rounded-xl font-black text-sm transition-all ${filters.page === pageNum ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600'}`}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                }
                                                if (pageNum === filters.page - 2 || pageNum === filters.page + 2) {
                                                    return <span key={pageNum} className="text-slate-400 px-1 font-bold">...</span>;
                                                }
                                                return null;
                                            })}
                                        </div>

                                        <button
                                            disabled={filters.page >= totalPages}
                                            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                                            className={`w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center transition-all ${filters.page >= totalPages ? 'opacity-30 cursor-not-allowed' : 'bg-white text-slate-400 hover:text-blue-600 hover:border-blue-200'}`}
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-40 text-center flex flex-col items-center bg-white rounded-[48px] border border-slate-100">
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
                                    <Search className="w-10 h-10 text-slate-200" />
                                </div>
                                <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Zero Matches.</h3>
                                <p className="text-slate-400 font-bold mb-10 max-w-sm">We couldn't find any listings in this category matching your filters. Try adjusting your parameters.</p>
                                <button
                                    onClick={() => setFilters({ city: '', state: '', area: '', minRating: 0, minReviews: 0, verifiedOnly: false, featuredOnly: false, openNow: false, amenities: [], page: 1 })}
                                    className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
