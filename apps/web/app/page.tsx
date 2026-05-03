"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  ArrowRight,
  TrendingUp,
  Compass,
  Sliders,
  Users,
  Heart,
  Phone,
  ShieldCheck,
  Star,
  ChefHat,
  Stethoscope,
  Sparkles,
  Wrench,
  ChevronDown,
  Plane,
  GraduationCap,
  Gamepad2,
  Ticket,
  Smartphone,
  Headset,
  CheckCircle2,
  Megaphone,
  Tag,
  Loader2,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BusinessCard from "../components/BusinessCard";
import DynamicIcon from "../components/DynamicIcon";
import OfferCard from "../components/OfferCard";
import { api, getImageUrl } from "../lib/api";
import Link from "next/link";
import { Category, Business, City } from "../types/api";
import Slider from "react-slick";
import CitySearchSelect from "../components/CitySearchSelect";
import { useRouter } from "next/navigation";
// Script is removed to avoid multiple loads (already in layout.tsx)

export default function HomePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<Business[]>([]);
  const [paginationMetadata, setPaginationMetadata] = useState({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 0,
    hasMore: false,
  });
  const [popularCities, setPopularCities] = useState<City[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [citiesList, setCitiesList] = useState<City[]>([]);
  const [latestOffers, setLatestOffers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const featuredRef = useRef<HTMLElement>(null);

  const [loading, setLoading] = useState(true);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [statsComments, setStatsComments] = useState<any[]>([]);
  // heroImages slider removed in favor of clean design
  const badgeText = "Your Local. Your Choice.";
  const highlights = [
    {
      icon: <ShieldCheck className="w-5 h-5 text-orange-500" />,
      title: "Verified Businesses",
      desc: "Trusted and reliable listings",
    },
    {
      icon: <Search className="w-5 h-5 text-green-500" />,
      title: "Fast & Easy Search",
      desc: "Find what you need instantly",
    },
    {
      icon: <Headset className="w-5 h-5 text-blue-500" />,
      title: "Local Support",
      desc: "We're here to help",
    },
  ];
  const quickCategories = [
    {
      name: "Education",
      icon: <GraduationCap className="w-5 h-5" />,
      color: "bg-orange-50 text-orange-600",
      slug: "education",
    },
    {
      name: "Airport",
      icon: <Plane className="w-5 h-5" />,
      color: "bg-blue-50 text-blue-600",
      slug: "airport",
    },
    {
      name: "Amusement park",
      icon: <Gamepad2 className="w-5 h-5" />,
      color: "bg-purple-50 text-purple-600",
      slug: "amusement-park",
    },
    {
      name: "Car repair",
      icon: <Wrench className="w-5 h-5" />,
      color: "bg-green-50 text-green-600",
      slug: "car-repair",
    },
  ];
  const sliderSettings = {
    dots: false,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 4000,
    speed: 1000,
    fade: true,
    arrows: false,
    pauseOnHover: false,
  };
  // 1. Initial Load (Everything)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const results = await Promise.allSettled([
          api.categories.getPopular(8),
          api.listings.getFeatured(1, 12),
          api.cities.getPopular(),
          api.categories.getAll(),
          api.cities.getAll(),
          api.offers.search({ limit: 20, placement: "homepage" }),
          api.reviews.getPopular(15),
        ]);

        const getValue = (result: PromiseSettledResult<any>, fallback: any) =>
          result.status === "fulfilled" ? result.value : fallback;

        setCategories(getValue(results[0], []));
        const featured = getValue(results[1], { data: [], meta: {} });
        setFeaturedBusinesses(featured?.data || []);
        if (featured?.meta) {
          setPaginationMetadata(prev => ({ ...prev, ...featured.meta }));
        }
        setPopularCities(getValue(results[2], []));
        setCategoriesList(getValue(results[3], []));
        setCitiesList(getValue(results[4], []));
        
        const latestOffersData = getValue(results[5], { data: [] });
        setLatestOffers(latestOffersData?.data || []);
        
        const statsCommentsData = getValue(results[6], { data: [] });
        setStatsComments(statsCommentsData?.data || []);
      } catch (err) {
        console.error("Initial load failed:", err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // 2. Pagination Load (Only Featured Businesses)
  useEffect(() => {
    if (loading) return; // Skip if initial load is still happening

    const loadFeaturedPage = async () => {
      try {
        setFeaturedLoading(true);
        const featured = await api.listings.getFeatured(paginationMetadata.page, 12);
        setFeaturedBusinesses(featured.data || []);
        if (featured.meta) {
          setPaginationMetadata(prev => ({ ...prev, ...featured.meta }));
        }
        // Scroll to section when page changes
        if (featuredRef.current) {
          const yOffset = -100; // Offset for navbar
          const y = featuredRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      } catch (err) {
        console.error("Failed to load featured page:", err);
      } finally {
        setFeaturedLoading(false);
      }
    };

    if (paginationMetadata.page > 1 || featuredBusinesses.length > 0) {
        loadFeaturedPage();
    }
  }, [paginationMetadata.page]);

  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim() && !selectedCity) return;
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append("q", searchQuery);
    if (selectedCity) params.append("city", selectedCity);
    if (userLocation) {
      params.append("latitude", String(userLocation.lat));
      params.append("longitude", String(userLocation.lng));
    }
    router.push(`/search?${params.toString()}`);
  };

  // Debounced search logging for "Live Search" heatmap
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) return;

    const timer = setTimeout(() => {
      api.demand
        .logSearch({
          keyword: searchQuery,
          city: selectedCity || undefined,
          latitude: userLocation?.lat,
          longitude: userLocation?.lng,
        })
        .catch((err) => console.error("Live demand logging failed:", err));
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCity, userLocation]);

  // Detect when Google Maps API is ready
  useEffect(() => {
    if ((window as any).google) {
      setMapReady(true);
      return;
    }

    const interval = setInterval(() => {
      if ((window as any).google) {
        setMapReady(true);
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Auto-detect location on load
  useEffect(() => {
    if (mapReady && !selectedCity && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          if (
            (window as any).google &&
            (window as any).google.maps &&
            (window as any).google.maps.Geocoder
          ) {
            const geocoder = new (window as any).google.maps.Geocoder();
            geocoder.geocode(
              { location: { lat: latitude, lng: longitude } },
              (results: any, status: any) => {
                if (status === "OK" && results[0]) {
                  let detectedCity = "";
                  results[0].address_components?.forEach((component: any) => {
                    if (component.types.includes("locality"))
                      detectedCity = component.long_name;
                    else if (
                      component.types.includes("administrative_area_level_2") &&
                      !detectedCity
                    )
                      detectedCity = component.long_name;
                  });
                  if (detectedCity) setSelectedCity(detectedCity);
                }
              },
            );
          }
        },
        (err) => console.log("Geolocation prompt rejected or failed:", err),
        { timeout: 5000 },
      );
    }
  }, [mapReady]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#FF7A30]" />
          <p className="text-slate-500 font-bold animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  const filteredCategories = categoriesList
    .filter((cat) => cat.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 5);

  const filteredCities = citiesList
    .filter((city) =>
      city.name.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .slice(0, 5);

  return (
    <div className=" bg-white font-sans text-slate-900 overflow-x-hidden">
      <Navbar />
      {/* Google Maps Script is handled in layout.tsx */}

      {/* Hero Section */}
      <section
        className="relative pt-10 pb-44 px-4 overflow-hidden bg-[#FBFBFC]"
        style={{ minHeight: "100vh" }}
      >
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 opacity-20 hidden md:block">
          <div className="grid grid-cols-4 gap-2">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="w-1 h-1 bg-orange-400 rounded-full" />
            ))}
          </div>
        </div>
        <div className="absolute top-40 right-20 opacity-20 hidden md:block">
          <ShieldCheck className="w-12 h-12 text-slate-300" />
        </div>
        <div className="absolute bottom-40 right-10 opacity-20 hidden md:block">
          <div className="grid grid-cols-4 gap-2">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="w-1 h-1 bg-orange-400 rounded-full" />
            ))}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 pointer-events-none opacity-5">
          <svg viewBox="0 0 1440 320" className="w-full h-auto">
            <path
              fill="#FF7A30"
              fillOpacity="1"
              d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,186.7C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            ></path>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-6 py-2 bg-orange-50 rounded-full mb-8 border border-orange-100/50 shadow-sm">
              <span className="text-[#FF7A30] font-black text-xs uppercase tracking-widest leading-none">
                * {badgeText}
              </span>
            </div>

            <h1 className="text-4xl md:text-7xl font-black mb-6 tracking-tighter text-[#112D4E] leading-[1.05]">
              Discover Trusted Local Businesses <br />
              <span className="text-[#FF7A30]">Instantly</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
              Search, compare & contact the best services near you —{" "}
              <br className="hidden md:block" /> fast and reliable.
            </p>
          </motion.div>

          {/* Search Bar Container */}
          <motion.div
            ref={searchRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="max-w-5xl mx-auto bg-white rounded-[24px]  p-2 flex flex-col md:flex-row items-stretch gap-2 border border-slate-100"
          >
            <div className="md:w-1/3 relative group ">
              <CitySearchSelect
                cities={citiesList}
                value={selectedCity}
                onChange={setSelectedCity}
              />
              <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-10 bg-slate-100 group-hover:bg-orange-500 transition-colors" />
            </div>

            <div className="flex-1 relative">
              <div className="relative h-full">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 z-10" />
                <input
                  type="text"
                  placeholder="Search categories or businesses..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSuggestionsOpen(true);
                  }}
                  onFocus={() => setIsSuggestionsOpen(true)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full h-full pl-14 pr-8 py-5 bg-transparent text-slate-900 placeholder:text-slate-400 border-none outline-none font-bold text-lg rounded-[20px]"
                />
              </div>

              {isSuggestionsOpen &&
                (filteredCategories.length > 0 ||
                  filteredCities.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 4 }}
                    className="absolute top-full left-0 right-0 mt-4 bg-white border border-slate-100 p-2 z-[100] max-h-[400px] overflow-y-auto  rounded-[20px]"
                  >
                    {filteredCategories.length > 0 && (
                      <div className="p-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-4 py-2 bg-slate-50 rounded-xl">
                          Categories
                        </p>
                        {filteredCategories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSearchQuery(cat.name);
                              setIsSuggestionsOpen(false);
                              router.push(`/search?category=${cat.slug}`);
                            }}
                            className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl text-slate-700 font-bold transition-all group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF7A30] group-hover:scale-110 transition-transform">
                                <Search className="w-4 h-4" />
                              </div>
                              <span>{cat.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
            </div>

            <button
              onClick={handleSearch}
              className="btn-orbit-accent px-10 !text-lg !rounded-[24px] h-[64px] shrink-0"
            >
              <Search className="w-5 h-5" />
              Search
            </button>
          </motion.div>

          {/* Quick Category Pills */}
          <div className="mt-8 grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Offers */}
            <Link href="/offers-events">
              <div className="group p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-orange-500">
                    <Tag className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">
                      Explore Offers
                    </h3>
                    <p className="text-sm text-slate-500">
                      Best deals & local events near you
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Broadcast */}
            <Link href="/broadcasts">
              <div className="group p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 hover:shadow-xl transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-500">
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">
                      Post Your Requirement
                    </h3>
                    <p className="text-sm text-slate-500">
                      Get quotes from nearby businesses
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Feature Highlights Bar */}
          <div className="mt-20 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 bg-white/50 backdrop-blur-md rounded-[24px] border border-slate-100 shadow-sm p-4 overflow-hidden">
            {highlights.map((h, i) => (
              <div
                key={i}
                className={`flex items-center gap-5 p-6 ${i !== highlights.length - 1 ? "md:border-r border-slate-100" : ""}`}
              >
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-50 shrink-0">
                  {h.icon}
                </div>
                <div className="text-left">
                  <h4 className="font-black text-[#112D4E] text-sm uppercase tracking-tight">
                    {h.title}
                  </h4>
                  <p className="text-slate-500 text-xs font-medium">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-6 mb-16">
            <div className="h-[1px] bg-slate-200 w-24 md:w-48" />
            <h2 className="text-4xl font-extrabold text-[#112D4E] tracking-tight whitespace-nowrap">
              Popular Categories
            </h2>
            <div className="h-[1px] bg-slate-200 w-24 md:w-48" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((cat, idx) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  href={`/search?category=${cat.slug}`}
                  className="group block"
                >
                  <div className="bg-slate-50 p-5 rounded-2xl border  flex items-center gap-6 hover:bg-white  hover:-translate-y-1 transition-all duration-500">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center group-hover:border-blue-200 group-hover:bg-blue-50/30 transition-all text-blue-600">
                      <DynamicIcon name={cat.icon} className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 mb-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                        {cat.name}
                      </h3>
                      <p className="text-sm text-slate-500 font-bold uppercase tracking-widest opacity-80">
                        {cat.businessCount || 0}+ Listings
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Businesses */}
      <section ref={featuredRef} className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-6 mb-16 text-center">
            <div className="h-[1px] bg-slate-200 w-24 md:w-48" />
            <h2 className="text-4xl font-extrabold text-[#112D4E] tracking-tight whitespace-nowrap">
              Featured Businesses
            </h2>
            <div className="h-[1px] bg-slate-200 w-24 md:w-48" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredLoading ? (
              <div className="col-span-full py-40 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-100">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                <p className="text-slate-400 font-bold">Refreshing listings...</p>
              </div>
            ) : featuredBusinesses.length > 0 ? (
              featuredBusinesses.map((biz, idx) => (
                <motion.div
                  key={biz.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: (idx % 4) * 0.1 }}
                >
                  <BusinessCard
                    business={biz}
                    variant={
                      idx % 4 === 0
                        ? "green"
                        : idx % 4 === 1
                          ? "blue"
                          : idx % 4 === 2
                            ? "white"
                            : "dark"
                    }
                    showChat={false}
                  />
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-100">
                <p className="text-slate-500 font-bold">
                  No featured businesses available at the moment.
                </p>
              </div>
            )}
          </div>

          {/* Pagination Bar */}
          {paginationMetadata.totalPages > 1 && (
            <div className="mt-16 flex justify-center items-center gap-4">
              <button
                onClick={() =>
                  setPaginationMetadata((prev) => ({
                    ...prev,
                    page: Math.max(1, prev.page - 1),
                  }))
                }
                disabled={paginationMetadata.page === 1}
                className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white hover:shadow-lg transition-all disabled:opacity-30 disabled:hover:shadow-none"
              >
                <ChevronDown className="w-6 h-6 rotate-90" />
              </button>

              <div className="flex items-center gap-2">
                {[...Array(paginationMetadata.totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setPaginationMetadata((prev) => ({
                        ...prev,
                        page: i + 1,
                      }))
                    }
                    className={`w-12 h-12 rounded-full font-black transition-all ${paginationMetadata.page === i + 1
                      ? "btn-orbit-accent !px-0 !py-0 !rounded-full shadow-lg"
                      : "hover:bg-white hover:shadow-md text-slate-600"
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() =>
                  setPaginationMetadata((prev) => ({
                    ...prev,
                    page: Math.min(prev.totalPages, prev.page + 1),
                  }))
                }
                disabled={
                  paginationMetadata.page === paginationMetadata.totalPages
                }
                className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white hover:shadow-lg transition-all disabled:opacity-30 disabled:hover:shadow-none"
              >
                <ChevronDown className="w-6 h-6 -rotate-90" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-6 mb-20 text-center">
            <div className="h-[1px] bg-slate-200 w-24 md:w-48" />
            <h2 className="text-4xl font-extrabold text-[#112D4E] tracking-tight whitespace-nowrap">
              How It Works
            </h2>
            <div className="h-[1px] bg-slate-200 w-24 md:w-48" />
          </div>

          <div className="grid md:grid-cols-3 gap-16 md:gap-8 max-w-5xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-8 relative">
                <div className="absolute top-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold border-4 border-white">
                  1
                </div>
                <Search className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black mb-4">1. Search & Find</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Choose the service you need from our verified categories.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8 relative">
                <div className="absolute top-0 right-0 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold border-4 border-white">
                  2
                </div>
                <Heart className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-black mb-4">2. Compare & Review</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Read reviews & select the best local providers.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-8 relative">
                <div className="absolute top-0 right-0 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold border-4 border-white">
                  3
                </div>
                <Phone className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-black mb-4">3. Contact & Connect</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Reach out directly to your chosen business in seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Special Offers & Events */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-6 mb-16 text-center">
            <div className="h-[1px] bg-slate-200 w-24 md:w-48" />
            <h2 className="text-4xl font-extrabold text-[#112D4E] tracking-tight whitespace-nowrap">
              Offers & Events
            </h2>
            <div className="h-[1px] bg-slate-200 w-24 md:w-48" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {latestOffers.length > 0 ? (
              latestOffers.map((offer, idx) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: (idx % 4) * 0.1 }}
                >
                  <OfferCard
                    offer={offer}
                    onEnquire={() => {
                      router.push(`/offers-events/${offer.id}`);
                    }}
                  />
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-100">
                <p className="text-slate-500 font-bold">
                  More offers and events coming soon from our trusted vendors.
                </p>
              </div>
            )}
          </div>

          <div className="mt-16 text-center">
            <Link
              href="/offers-events"
              className="text-orange-500 font-bold hover:gap-4 transition-all inline-flex items-center gap-2 text-lg"
            >
              View All Offers & Events <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Top Cities We Serve */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-6 mb-16 text-center">
            <div className="h-[1px] bg-slate-200 w-24 md:w-48" />
            <h2 className="text-4xl font-extrabold text-[#112D4E] tracking-tight whitespace-nowrap">
              Top Cities We Serve
            </h2>
            <div className="h-[1px] bg-slate-200 w-24 md:w-48" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {popularCities.slice(0, 10).map((city, idx) => (
              <motion.div
                key={city.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link
                  href={`/search?city=${city.name}`}
                  className="relative h-48 rounded-2xl overflow-hidden block group shadow-lg"
                >
                  <img
                    src={
                      getImageUrl(city.heroImageUrl || city.imageUrl) ||
                      "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&q=80&w=400"
                    }
                    alt={city.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 brightness-75 group-hover:brightness-90"
                  />
                  <div className="absolute inset-x-0 bottom-6 text-center">
                    <span className="text-white text-xl font-black drop-shadow-lg tracking-tight">
                      {city.name}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/cities"
              className="text-blue-600 font-bold hover:gap-4 transition-all inline-flex items-center gap-2 text-lg"
            >
              View All Cities <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials - What People Are Saying */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-16">
          <div className="flex items-center justify-center gap-6 text-center">
            <div className="h-[1px] bg-slate-200 w-24 md:w-48" />
            <h2 className="text-4xl font-extrabold text-[#112D4E] tracking-tight whitespace-nowrap">
              What People Are Saying
            </h2>
            <div className="h-[1px] bg-slate-200 w-24 md:w-48" />
          </div>
        </div>

        {(() => {
          const fallbackReviews = [
            {
              id: "f1",
              name: "Ahmed S.",
              location: "Karachi",
              role: "Local Guide",
              text: "Found a great plumber in Karachi in minutes. Highly recommend!",
              rating: 5,
              img: "https://i.pravatar.cc/150?u=ahmed",
            },
            {
              id: "f2",
              name: "Zainab R.",
              location: "Lahore",
              role: "Local Guide",
              text: "Excellent service. Easy to find and contact businesses in Lahore.",
              rating: 5,
              img: "https://i.pravatar.cc/150?u=zainab",
            },
            {
              id: "f3",
              name: "Bilal K.",
              location: "Islamabad",
              role: "Local Guide",
              text: "Trusted and reliable listings. Best platform for Pakistan.",
              rating: 5,
              img: "https://i.pravatar.cc/150?u=bilal",
            },
            {
              id: "f4",
              name: "Sara M.",
              location: "Faisalabad",
              role: "Local Guide",
              text: "Booking appointments has never been so easy. Love this platform!",
              rating: 4,
              img: "https://i.pravatar.cc/150?u=sara",
            },
            {
              id: "f5",
              name: "Usman T.",
              location: "Rawalpindi",
              role: "Local Guide",
              text: "Great variety of businesses listed. Found exactly what I needed.",
              rating: 5,
              img: "https://i.pravatar.cc/150?u=usman",
            },
            {
              id: "f6",
              name: "Hina N.",
              location: "Multan",
              role: "Local Guide",
              text: "Very user-friendly! Found a top doctor in my area within seconds.",
              rating: 5,
              img: "https://i.pravatar.cc/150?u=hina",
            },
          ];
          // Fallback to professional reviews if no community results
          const cards =
            statsComments && Array.isArray(statsComments) && statsComments.length > 0
              ? statsComments.map((rev: any) => ({
                id: rev.id,
                name: rev.user?.fullName || "Aman U.",
                location: rev.user?.city || "Local",
                role: "Verified Local",
                text: rev.comment,
                rating: rev.rating || 5,
                img: rev.user?.avatarUrl ? getImageUrl(rev.user.avatarUrl) : null,
                date: rev.createdAt,
                business: rev.business?.title || "Local Shop",
              }))
              : fallbackReviews;


          // Triple the cards for smooth infinite scroll
          const row1 = [...cards, ...cards, ...cards];
          const row2 = [...cards, ...cards, ...cards];

          const ReviewCard = ({
            card,
            idx,
          }: {
            card: (typeof row1)[0];
            idx: number;
          }) => (
            <div
              key={`${card.id}-${idx}`}
              className="flex-shrink-0 w-80 bg-[#F8FAFC] p-6 rounded-2xl border border-slate-100 flex items-start gap-4 shadow-sm mx-3"
            >
              <div className="w-12 h-12 rounded-full border-2 border-white shadow bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-base uppercase overflow-hidden flex-shrink-0">
                {card.img ? (
                  <img
                    src={card.img}
                    alt={card.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  card.name[0].toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 text-sm mb-0.5 truncate">
                  {card.name}
                  {card.location ? `, ${card.location}` : ""}
                </h4>
                <div className="flex gap-0.5 mb-1.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < (card.rating || 5) ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
                    />
                  ))}
                </div>
                <p className="text-slate-600 text-sm italic leading-relaxed line-clamp-3">
                  "{card.text}"
                </p>
              </div>
            </div>
          );

          return (
            <div className="max-w-7xl mx-auto px-4">
              <div className="relative overflow-hidden py-4">
                <div className="flex w-max animate-scroll hover:[animation-play-state:paused]">
                  {row1.map((card, idx) => (
                    <ReviewCard key={`row1-${idx}`} card={card} idx={idx} />
                  ))}
                </div>
                <div className="flex w-max animate-scroll-reverse hover:[animation-play-state:paused] mt-6">
                  {row2.map((card, idx) => (
                    <ReviewCard key={`row2-${idx}`} card={card} idx={idx} />
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Business Recruitment CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-r from-[#0B2244] to-[#0D2E61] rounded-xl p-8 md:px-12 md:py-10 relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 border border-white/5">
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")',
                opacity: 0.1,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />

            <div className="relative z-10 text-center md:text-left">
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                Own a Business? Get More Customers Today!
              </h2>
              <p className="text-white/80 text-lg md:text-xl font-medium">
                List your business for free and grow your reach.
              </p>
            </div>

            <div className="relative z-10 shrink-0">
              <Link
                href="/register?role=vendor"
                className="bg-gradient-to-r from-[#FF7A30] to-[#FF9050] hover:from-[#E86920] hover:to-[#FF7A30] text-white px-10 py-4 rounded-xl font-bold text-lg md:text-xl transition-all shadow-[0_10px_20px_-5px_rgba(255,122,48,0.4)] active:scale-95 whitespace-nowrap flex items-center justify-center border border-white/10"
              >
                Add Your Business
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
