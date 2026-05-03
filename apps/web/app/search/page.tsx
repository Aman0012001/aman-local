"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LayoutGrid, List, Filter, ChevronRight, Star, ShieldCheck, Search, MapPin, Activity, Navigation, Loader2, Sliders, CheckCircle2 } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import BusinessCard from '../../components/BusinessCard';
import { api } from '../../lib/api';
import { Business, Category, City } from '../../types/api';
import Link from 'next/link';

function SearchResults() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const query = searchParams.get('q') || '';
    const city = searchParams.get('city') || '';
    const categorySlug = searchParams.get('category') || '';
    const minRating = searchParams.get('minRating') || '';
    const radius = searchParams.get('radius') || '';
    const latitude = searchParams.get('latitude') || '';
    const longitude = searchParams.get('longitude') || '';
    const openNow = searchParams.get('openNow') === 'true';
    const verifiedOnly = searchParams.get('verifiedOnly') === 'true';

    const [results, setResults] = useState<Business[]>([]);
    const [totalResults, setTotalResults] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [amenities, setAmenities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);

    const areaInputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    // Check for google maps availability
    const [mapReady, setMapReady] = useState(false);

    // Dynamically derive provinces from cities data
    const provinces = useMemo(() => {
        const uniqueStates = new Set(cities.map(c => c.state).filter(Boolean));
        return Array.from(uniqueStates).sort();
    }, [cities]);

    const currentPage = Number(searchParams.get('page')) || 1;

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [searchRes, cats, citiesData, amenitiesData] = await Promise.all([
                    api.listings.search({
                        query: query,
                        city: city,
                        categorySlug: categorySlug,
                        minRating: minRating,
                        radius: radius ? Number(radius) : undefined,
                        latitude: latitude ? Number(latitude) : undefined,
                        longitude: longitude ? Number(longitude) : undefined,
                        openNow: openNow || undefined,
                        verifiedOnly: verifiedOnly || undefined,
                        featuredOnly: searchParams.get('featuredOnly') === 'true' || undefined,
                        sortBy: searchParams.get('sortBy') || undefined,
                        state: searchParams.get('state') || undefined,
                        area: searchParams.get('area') || undefined,
                        amenityIds: searchParams.get('amenities') || undefined,
                        minReviews: searchParams.get('minReviews') || undefined,
                        page: currentPage,
                        limit: 20
                    }),
                    api.categories.getAll(),
                    api.cities.getAll(),
                    api.listings.getAmenities()
                ]);
                setResults(searchRes.data);
                setTotalResults(searchRes.meta.total);
                setTotalPages(searchRes.meta.totalPages);
                setCategories(cats);
                setCities(citiesData || []);
                setAmenities(amenitiesData || []);

                // Log demand if there's a query or category
                if (query || categorySlug) {
                    api.demand.logSearch({
                        keyword: query || categorySlug,
                        city: city || undefined,
                        latitude: latitude ? Number(latitude) : undefined,
                        longitude: longitude ? Number(longitude) : undefined,
                    }).catch(err => console.error('Demand logging failed:', err));
                }
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [query, city, categorySlug, minRating, radius, latitude, longitude, openNow, verifiedOnly, searchParams]);

    // Initialize Google Places Autocomplete for Area input
    useEffect(() => {
        if (!mapReady || !areaInputRef.current || !window.google?.maps?.places) return;

        const autocomplete = new google.maps.places.Autocomplete(areaInputRef.current, {
            componentRestrictions: { country: 'pk' },
            fields: ['address_components', 'geometry', 'name'],
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry) {
                const addressComponents = place.address_components || [];
                let areaName = place.name || '';

                // If we want to filter by coordinates too
                if (place.geometry?.location) {
                    const params = new URLSearchParams(window.location.search);
                    params.set('latitude', String(place.geometry.location.lat()));
                    params.set('longitude', String(place.geometry.location.lng()));
                    params.set('area', areaName);
                    router.push(`/search?${params.toString()}`);
                }
            }
        });

        return () => {
            if (window.google?.maps?.event) {
                window.google.maps.event.clearInstanceListeners(areaInputRef.current!);
            }
        };
    }, [mapReady, router]);


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

    const handleNearMe = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const params = new URLSearchParams(searchParams.toString());
                params.set('latitude', String(latitude));
                params.set('longitude', String(longitude));
                if (!params.has('radius')) params.set('radius', '10');
                router.push(`/search?${params.toString()}`);
                setGeoLoading(false);
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert('Could not get your location. Please check your browser permissions.');
                setGeoLoading(false);
            }
        );
    };

    const updateFilter = (key: string, value: string | boolean | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === null || value === false || value === '') {
            params.delete(key);
        } else {
            params.set(key, String(value));
        }

        // Reset city and area when state changes
        if (key === 'state') {
            params.delete('city');
            params.delete('area');
        }

        // Reset page when any filter other than page changes
        if (key !== 'page') {
            params.delete('page');
        }

        router.push(`/search?${params.toString()}`);
    };

    return (
        <div className="min-h-screen  flex flex-col">
            <Navbar />

            <main className="flex-grow max-w-7xl mx-auto px-4 w-full pt-28 pb-20">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 mb-8 px-1">
                    <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                    <ChevronRight className="w-3 h-3" />
                    <Link href="/search" className="hover:text-blue-600 transition-colors">Search</Link>
                    {query && (
                        <>
                            <ChevronRight className="w-3 h-3" />
                            <span className="text-slate-900">{query}</span>
                        </>
                    )}
                </nav>

                <div className="flex flex-col lg:flex-row justify-between items-start md:items-end gap-6 mb-10 px-1">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-[#1e293b] tracking-tighter mb-3">
                            {totalResults} results for <span className="text-blue-600">'{query || categorySlug || 'Businesses'}'</span> {city && <>in <span className="text-blue-600">{city}</span></>}
                        </h1>
                        <p className="text-slate-500 font-bold text-lg tracking-tight">
                            Showing top rated professional services {city ? `near ${city}` : 'in your area'}
                        </p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm min-w-[200px]">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sort by:</span>
                            <select
                                value={searchParams.get('sortBy') || 'relevance'}
                                onChange={(e) => updateFilter('sortBy', e.target.value)}
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

                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-10 items-start">
                    {/* Filters Sidebar */}
                    <aside className="lg:col-span-3 w-full sticky top-28">
                        <div className="bg-white  rounded-[15px] border border-slate-200 p-8 shadow-sm space-y-10">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#1e293b]">Filters</h3>
                                <button
                                    onClick={() => router.push('/search')}
                                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                                >
                                    Clear All
                                </button>
                            </div>

                            {/* Category Filter */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sliders className="w-3.5 h-3.5" /> Category
                                </h4>
                                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                    {categories.map(cat => (
                                        <label key={cat.id} className="flex items-center justify-between group cursor-pointer">
                                            <div className="flex items-center">
                                                <div className="relative flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        className="peer appearance-none w-5 h-5 rounded-lg border-2 border-slate-100 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                                                        checked={categorySlug === cat.slug}
                                                        onChange={() => {
                                                            const params = new URLSearchParams(searchParams.toString());
                                                            if (categorySlug === cat.slug) {
                                                                params.delete('category');
                                                            } else {
                                                                params.set('category', cat.slug);
                                                            }
                                                            router.push(`/search?${params.toString()}`);
                                                        }}
                                                    />
                                                    <div className="absolute text-white scale-0 peer-checked:scale-100 transition-transform">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                    </div>
                                                </div>
                                                <span className={`ml-3 text-xs font-bold transition-all ${categorySlug === cat.slug ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-900'}`}>{cat.name}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6 pt-4 border-t border-slate-50">
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
                                        value={searchParams.get('state') || ''}
                                        onChange={(e) => {
                                            const params = new URLSearchParams(searchParams.toString());
                                            params.set('state', e.target.value);
                                            params.delete('city'); // Clear city when state changes
                                            router.push(`/search?${params.toString()}`);
                                        }}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">All Provinces</option>
                                        {provinces.map(p => (
                                            <option key={p} value={p || ''}>{p}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={city}
                                        onChange={(e) => updateFilter('city', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">All Cities</option>
                                        {cities
                                            .filter(c => !searchParams.get('state') || c.state === searchParams.get('state'))
                                            .map(c => (
                                                <option key={c.id} value={c.name}>{c.name}</option>
                                            ))}
                                    </select>

                                    <div className="relative group">
                                        <input
                                            ref={areaInputRef}
                                            type="text"
                                            placeholder="Area / Locality..."
                                            value={searchParams.get('area') || ''}
                                            onChange={(e) => updateFilter('area', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 transition-all"
                                        />
                                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 pt-4 border-t border-slate-50">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Navigation className="w-3.5 h-3.5" /> Distance
                                    </h4>
                                    {latitude && <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{radius || 10} km</span>}
                                </div>

                                {!latitude ? (
                                    <button
                                        onClick={handleNearMe}
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
                                            onChange={(e) => updateFilter('radius', e.target.value)}
                                            className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6 pt-4 border-t border-slate-50">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Star className="w-3.5 h-3.5" /> Ratings & Reviews
                                </h4>
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        {[4.5, 4, 3].map(star => (
                                            <label key={star} className="flex items-center group cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-slate-200 text-blue-600 focus:ring-blue-500/10 cursor-pointer"
                                                    checked={minRating === String(star)}
                                                    onChange={() => updateFilter('minRating', minRating === String(star) ? null : String(star))}
                                                />
                                                <div className="ml-3 flex items-center gap-1">
                                                    <span className="text-xs font-bold text-slate-600">{star}+</span>
                                                    <div className="flex">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className={`w-3 h-3 ${i < Math.floor(star) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="pt-2">
                                        <select
                                            value={searchParams.get('minReviews') || ''}
                                            onChange={(e) => updateFilter('minReviews', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">Any Number of Reviews</option>
                                            <option value="10">10+ Reviews</option>
                                            <option value="50">50+ Reviews</option>
                                            <option value="100">100+ Reviews</option>
                                            <option value="500">500+ Reviews</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 pt-4 border-t border-slate-50">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sliders className="w-3.5 h-3.5" /> Services & Facilities
                                </h4>
                                <div className="grid grid-cols-1 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {amenities.map(amenity => {
                                        const currentAmenities = searchParams.get('amenities')?.split(',') || [];
                                        const isChecked = currentAmenities.includes(amenity.id);
                                        return (
                                            <label key={amenity.id} className="flex items-center group cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-slate-200 text-blue-600 focus:ring-blue-500/10 cursor-pointer"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const newAmenities = e.target.checked
                                                            ? [...currentAmenities, amenity.id]
                                                            : currentAmenities.filter(id => id !== amenity.id);
                                                        updateFilter('amenities', newAmenities.join(','));
                                                    }}
                                                />
                                                <span className="ml-3 text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{amenity.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-50">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-xs font-bold text-slate-500 group-hover:text-[#1e293b] transition-colors">Open Now</span>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={openNow}
                                            onChange={(e) => updateFilter('openNow', e.target.checked)}
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
                                            checked={verifiedOnly}
                                            onChange={(e) => updateFilter('verifiedOnly', e.target.checked)}
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
                                            checked={searchParams.get('featuredOnly') === 'true'}
                                            onChange={(e) => updateFilter('featuredOnly', e.target.checked)}
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
                        ) : results.length > 0 ? (
                            <>
                                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                                    {results.map(biz => (
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
                                            disabled={currentPage <= 1}
                                            onClick={() => updateFilter('page', String(currentPage - 1))}
                                            className={`w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center transition-all ${currentPage <= 1 ? 'opacity-30 cursor-not-allowed' : 'bg-white text-slate-400 hover:text-blue-600 hover:border-blue-200'}`}
                                        >
                                            <ChevronRight className="w-5 h-5 rotate-180" />
                                        </button>

                                        <div className="flex items-center gap-2">
                                            {[...Array(totalPages)].map((_, i) => {
                                                const pageNum = i + 1;
                                                // Simple pagination logic: show current, first, last, and neighbors
                                                if (
                                                    pageNum === 1 ||
                                                    pageNum === totalPages ||
                                                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                                ) {
                                                    return (
                                                        <button
                                                            key={pageNum}
                                                            onClick={() => updateFilter('page', String(pageNum))}
                                                            className={`w-12 h-12 rounded-xl font-black text-sm transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600'}`}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                }
                                                if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                                    return <span key={pageNum} className="text-slate-400 px-1 font-bold">...</span>;
                                                }
                                                return null;
                                            })}
                                        </div>

                                        <button
                                            disabled={currentPage >= totalPages}
                                            onClick={() => updateFilter('page', String(currentPage + 1))}
                                            className={`w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center transition-all ${currentPage >= totalPages ? 'opacity-30 cursor-not-allowed' : 'bg-white text-slate-400 hover:text-blue-600 hover:border-blue-200'}`}
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
                                <p className="text-slate-400 font-bold mb-10 max-w-sm">We couldn't find any listings matching your specific parameters. Adjust your filters or try a broader search.</p>
                                <button
                                    onClick={() => router.push('/search')}
                                    className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    Start Fresh Search
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

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-12 h-12 border-t-2 border-blue-600 rounded-full animate-spin" />
            </div>
        }>
            <SearchResults />
        </Suspense>
    );
}

