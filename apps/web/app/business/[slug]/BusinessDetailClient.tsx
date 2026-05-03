"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Star,
  MapPin,
  Globe,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  Share2,
  Heart,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  Send,
  User,
  Tag,
  Zap,
  Calendar,
  Megaphone,
  Store,
  Search,
  ArrowLeft,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Link as LinkIcon,
  Images,
  Navigation,
  Loader2,
  Footprints,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import Link from "next/link";
import FollowButton from "../../../components/FollowButton";
import { api, getImageUrl } from "../../../lib/api";
import { Business } from "../../../types/api";
import { useAuth } from "../../../context/AuthContext";
import { getBusinessOpenStatus } from "../../../lib/business-status";
import ChatTrigger, {
  ChatTriggerHandle,
} from "../../../components/chat/ChatTrigger";
import { useChat } from "../../../hooks/useChat";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

// Simple Online/Offline badge — green when vendor is logged in, red when not
const VendorOnlineBadge = ({
  isOnline,
  lastActiveAt,
  lastLogoutAt,
}: {
  isOnline?: boolean;
  lastActiveAt?: string;
  lastLogoutAt?: string;
}) => {
  if (isOnline) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Online
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 shadow-sm">
      <span className="w-2 h-2 rounded-full bg-red-500" />
      Offline
    </span>
  );
};

// Open / Closed badge based on business hours
// Falls back to vendor.businessHours (Record) if listing.businessHours (Array) is empty
const BusinessOpenBadge = ({ business }: { business: Business }) => {
  const hoursData =
    business.businessHours && business.businessHours.length > 0
      ? business.businessHours
      : business.vendor?.businessHours;

  const { status, label, todayHours } = getBusinessOpenStatus(hoursData);
  if (status === "UNKNOWN") return null;

  const isOpen = status === "OPEN";
  return (
    <span
      title={todayHours ? `Today: ${todayHours}` : undefined}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${isOpen
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-slate-100 text-slate-600 border-slate-200"
        }`}
    >
      <Clock className="w-3.5 h-3.5" />
      {todayHours ? `${todayHours} (${label})` : label}
    </span>
  );
};

interface BusinessDetailClientProps {
  slug: string;
}

export default function BusinessDetailClient({
  slug,
}: BusinessDetailClientProps) {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [comments, setComments] = useState<any[]>([]); // We keep the name 'comments' to minimize changes but it will hold Review objects
  const [isFavorite, setIsFavorite] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Review replying state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const chatRef = useRef<ChatTriggerHandle>(null);

  // Enquiry modal state
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [enquiryName, setEnquiryName] = useState("");
  const [enquiryEmail, setEnquiryEmail] = useState("");
  const [enquiryPhone, setEnquiryPhone] = useState("");
  const [enquiryMessage, setEnquiryMessage] = useState("");
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryError, setEnquiryError] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "call" | "whatsapp" | null
  >(null);

  // Lightbox state
  const [showLightbox, setShowLightbox] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Offers & Events
  const [offers, setOffers] = useState<any[]>([]);

  // Map State & Refs
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const initInProgress = useRef(false);

  const initMap = async () => {
    // Only initialize if we have the container, business data, and we are on the Overview tab
    // Also don't initialize if already in progress
    if (
      !mapContainerRef.current ||
      !business ||
      activeTab !== "Overview" ||
      initInProgress.current
    )
      return;

    try {
      initInProgress.current = true;

      // Coordinate parsing for Pakistan context (fallback if invalid)
      const lat = parseFloat(String(business.latitude)) || 30.3753;
      const lng = parseFloat(String(business.longitude)) || 69.3451;
      const center = { lat, lng };

      console.log("[BusinessDetail] Initializing map at:", center);

      // Ensure window.google.maps is available
      if (!(window as any).google?.maps?.importLibrary) {
        console.warn(
          "[BusinessDetail] Google Maps importLibrary not available yet",
        );
        initInProgress.current = false;
        return;
      }

      const { Map } = await (window as any).google.maps.importLibrary("maps");

      // Final check to ensure container is still in DOM before creating instance
      if (!mapContainerRef.current) {
        initInProgress.current = false;
        return;
      }

      if (!mapRef.current) {
        // Initialize the Map
        mapRef.current = new Map(mapContainerRef.current, {
          center,
          zoom: 15,
          mapTypeId: "roadmap",
          zoomControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          maxZoom: 19,
          minZoom: 2,
        });

        console.log("[BusinessDetail] Map instance created");

        // Try AdvancedMarkerElement (requires MapId, which we removed for stability)
        // We'll use legacy Marker for better reliability unless a Map ID is provided
        try {
          const { Marker } = await (window as any).google.maps.importLibrary(
            "marker",
          );
          markerRef.current = new Marker({
            position: center,
            map: mapRef.current,
            title: business.title,
            animation: (window as any).google.maps.Animation?.DROP,
          });
          console.log("[BusinessDetail] Legacy Marker initialized");
        } catch (markerErr) {
          console.warn("[BusinessDetail] Marker failed:", markerErr);
        }
      } else {
        // Update existing map if business data changed or tab switched back
        mapRef.current.setCenter(center);
        // Trigger a resize to ensure map renders correctly after being hidden
        if ((window as any).google?.maps?.event) {
          (window as any).google.maps.event.trigger(mapRef.current, "resize");
        }

        if (markerRef.current) {
          if (markerRef.current.setPosition) {
            markerRef.current.setPosition(center);
          } else {
            markerRef.current.position = center;
          }
        }
      }
    } catch (err) {
      console.error("[BusinessDetail] GOOGLE MAP CRITICAL ERROR:", err);
      setMapError(true);
    } finally {
      initInProgress.current = false;
    }
  };

  useEffect(() => {
    if (loading || !mapLoaded || !business || activeTab !== "Overview") return;

    const frameId = window.requestAnimationFrame(() => {
      initMap();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      // Cleanup map listeners to avoid Node.removeChild (NotFoundError)
      if (mapRef.current && (window as any).google?.maps?.event) {
        try {
          (window as any).google.maps.event.clearInstanceListeners(mapRef.current);
        } catch (e) {
          console.warn("[BusinessDetail] Map cleanup failed:", e);
        }
      }
    };
  }, [loading, mapLoaded, business, activeTab]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window as any).google?.maps?.importLibrary
    ) {
      console.log("[BusinessDetail] Google Maps script found");
      setMapLoaded(true);
      return;
    }

    const interval = setInterval(() => {
      if (
        typeof window !== "undefined" &&
        (window as any).google?.maps?.importLibrary
      ) {
        console.log("[BusinessDetail] Google Maps backend ready");
        setMapLoaded(true);
        clearInterval(interval);
      }
    }, 1000);

    // Handle API Key failures (global callback)
    (window as any).gm_authFailure = () => {
      console.error(
        "[BusinessDetail] Google Maps auth failure - check API Key and Billing",
      );
      setMapError(true);
    };

    return () => {
      if (interval) clearInterval(interval);
      // Don't delete gm_authFailure globally as it might affect other pages
    };
  }, []);

  useEffect(() => {
    const loadBusiness = async () => {
      let actualSlug = slug;

      // Handle SPA fallback where the page is served by a 'template' HTML file
      if (
        (slug === "template" || slug === "sample-business") &&
        typeof window !== "undefined"
      ) {
        const pathParts = window.location.pathname.split("/").filter(Boolean);
        // URL structure: /business/slug/ or /business/slug
        if (
          pathParts[0] === "business" &&
          pathParts[1] &&
          pathParts[1] !== "template"
        ) {
          actualSlug = pathParts[1];
          console.log(
            "[BusinessDetail] Fallback detected, using actual slug from URL:",
            actualSlug,
          );
        }
      }

      console.log(
        "[BusinessDetail] Starting loadBusiness for slug:",
        actualSlug,
      );
      setLoading(true);
      setError(null);

      try {
        const data = await api.listings.getBySlug(actualSlug as string);
        console.log(
          "[BusinessDetail] Business data received:",
          data?.id,
          "isOnline:",
          data?.vendor?.user?.isOnline,
        );
        if (data?.vendor?.user) {
          console.log("[BusinessDetail] Vendor User:", {
            email: data.vendor.user.email,
            isOnline: data.vendor.user.isOnline,
            lastLogin: data.vendor.user.lastLoginAt,
          });
        }
        setBusiness(data);

        // Load reviews (replaces legacy comments)
        try {
          const reviewsData = await api.reviews.getByBusiness(data.id);
          setComments(reviewsData.data || []);
        } catch (ce) {
          console.error("[BusinessDetail] Failed to load reviews:", ce);
        }

        // Load public offers for this business
        try {
          const offersData = await api.offers.getByBusiness(data.id);
          if (Array.isArray(offersData)) {
            const now = new Date();
            const activeOnly = offersData.filter((o: any) => {
              const expiry = o.expiryDate ? new Date(o.expiryDate) : null;
              const end = o.endDate ? new Date(o.endDate) : null;
              return (!expiry || expiry > now) && (!end || end > now);
            });
            setOffers(activeOnly);
          } else {
            setOffers([]);
          }
        } catch (oe) {
          console.error("[BusinessDetail] Failed to load offers:", oe);
        }

        // Check for referral code in URL
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get("ref");
        if (refCode && typeof window !== "undefined") {
          // Try to track the click for the logged in user
          if (user) {
            try {
              await api.affiliate.trackClick(refCode);
            } catch (e) { }
          } else {
            // Store in session storage for later if not logged in
            sessionStorage.setItem("referralCode", refCode);
          }
        }
      } catch (err: any) {
        console.error(
          "[BusinessDetail] CRITICAL error loading business details:",
          err,
        );
        setError(err.message || "Failed to load business details");
      } finally {
        console.log(
          "[BusinessDetail] Finishing loadBusiness, setting loading false",
        );
        setLoading(false);
      }
    };
    if (slug) loadBusiness();
  }, [slug]);

  // Separate effect for user-specific state (e.g. favorite status)
  useEffect(() => {
    const checkUserStates = async () => {
      if (user && business?.id) {
        try {
          const favs = await api.users.getFavorites();
          setIsFavorite(favs.data.some((fav) => fav.id === business.id));
        } catch (fe) {
          console.error(
            "[BusinessDetail] Failed to check favorite status:",
            fe,
          );
        }
      }
    };
    checkUserStates();
  }, [user, business?.id]);

  // Pre-fill enquiry form when user is available
  useEffect(() => {
    if (user) {
      setEnquiryName(user.fullName || "");
      setEnquiryEmail(user.email || "");
    }
  }, [user]);

  const handleLike = async () => {
    if (!user) {
      alert("Please login to add to favorites");
      return;
    }
    if (!business) return;

    try {
      if (isFavorite) {
        await api.users.removeFavorite(business.id);
        setIsFavorite(false);
      } else {
        await api.users.addFavorite(business.id);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  const handleContactIntent = async (
    action: "call" | "whatsapp" | "enquiry",
  ) => {
    if (!user) {
      alert("Please login to connect with this business.");
      return;
    }

    if (action === "enquiry") {
      setPendingAction(null);
      chatRef.current?.open();
      return;
    }

    // For direct actions (Call/WhatsApp), generate lead immediately and then redirect
    try {
      await api.leads.createLead({
        businessId: business!.id,
        name: user.fullName || "User",
        email: user.email || "",
        phone: user.phone || undefined,
        message: `User clicked ${action === "call" ? "Call Now" : "WhatsApp Express"}`,
        type: action,
        source: `direct-${action}`,
      });

      if (action === "call" && business?.phone) {
        window.location.href = `tel:${business.phone}`;
      } else if (
        action === "whatsapp" &&
        (business?.whatsapp || business?.phone)
      ) {
        const waNumber = (business.whatsapp || business.phone).replace(
          /\s+/g,
          "",
        );
        window.open(
          `https://wa.me/${waNumber.startsWith("+") ? waNumber.substring(1) : waNumber}`,
          "_blank",
        );
      }
    } catch (err) {
      console.error("Failed to generate lead:", err);
      // Still perform the action even if lead capture fails
      if (action === "call" && business?.phone) {
        window.location.href = `tel:${business.phone}`;
      } else if (
        action === "whatsapp" &&
        (business?.whatsapp || business?.phone)
      ) {
        const waNumber = (business.whatsapp || business.phone).replace(
          /\s+/g,
          "",
        );
        window.open(
          `https://wa.me/${waNumber.startsWith("+") ? waNumber.substring(1) : waNumber}`,
          "_blank",
        );
      }
    }
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    if (!enquiryName.trim() || !enquiryEmail.trim() || !enquiryMessage.trim()) {
      setEnquiryError("Please fill in all required fields.");
      return;
    }
    setSubmittingEnquiry(true);
    setEnquiryError("");
    try {
      await api.leads.createLead({
        businessId: business.id,
        name: enquiryName.trim(),
        email: enquiryEmail.trim(),
        phone: enquiryPhone.trim() || undefined,
        message: enquiryMessage.trim(),
        type: "chat",
        source: pendingAction ? `intent-${pendingAction}` : "business-page",
      });
      setEnquirySuccess(true);
      setEnquiryMessage("");

      // After successful lead capture (for modal flow if any), trigger the pending action
      if (pendingAction === "call" && business.phone) {
        window.location.href = `tel:${business.phone}`;
      } else if (
        pendingAction === "whatsapp" &&
        (business.whatsapp || business.phone)
      ) {
        const waNumber = (business.whatsapp || business.phone).replace(
          /\s+/g,
          "",
        );
        window.open(
          `https://wa.me/${waNumber.startsWith("+") ? waNumber.substring(1) : waNumber}`,
          "_blank",
        );
      }

      setTimeout(() => {
        setShowEnquiryModal(false);
        setEnquirySuccess(false);
        setPendingAction(null);
      }, 2500);
    } catch (err: any) {
      setEnquiryError(
        err.message || "Failed to send enquiry. Please try again.",
      );
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  const openEnquiryModal = () => {
    setEnquirySuccess(false);
    setEnquiryError("");
    setEnquiryMessage("");
    setShowEnquiryModal(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to write a review");
      return;
    }
    if (!business) return;

    if (reviewComment.trim() && reviewComment.trim().length < 10) {
      alert("Review comment must be at least 10 characters long.");
      return;
    }

    setSubmittingReview(true);
    try {
      await api.reviews.create({
        businessId: business.id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      // Refresh reviews
      const reviewsData = await api.reviews.getByBusiness(business.id);
      setComments(reviewsData.data || []);
      setShowReviewModal(false);
      setReviewComment("");
      setReviewRating(5);
    } catch (err: any) {
      alert(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReplySubmit = async (reviewId: string) => {
    if (!user) {
      alert("Please login to reply");
      return;
    }
    if (!isOwner) {
      alert("Only the business owner can reply to reviews");
      return;
    }
    if (!replyContent.trim()) return;

    setSubmittingReply(true);
    try {
      await api.reviews.createReply(reviewId, replyContent.trim());
      // Refresh reviews
      const reviewsData = await api.reviews.getByBusiness(business!.id);
      setComments(reviewsData.data || []);
      setReplyingTo(null);
      setReplyContent("");
    } catch (err: any) {
      alert(err.message || "Failed to submit reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">
          Loading business details...
        </div>
      </div>
    );

  if (error || !business) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
            <div className="relative mx-auto w-40 h-40">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="absolute inset-0 bg-blue-50 rounded-[28px] rotate-6"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  delay: 0.1,
                }}
                className="absolute inset-0 bg-white border-2 border-slate-100 rounded-[28px] shadow-sm flex items-center justify-center"
              >
                <Store className="w-16 h-16 text-slate-200" />
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30">
                  <X className="w-5 h-5 text-white" />
                </div>
              </motion.div>
            </div>

            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
                Business Not Found
              </h1>
              <p className="text-slate-500 font-medium leading-relaxed max-w-sm mx-auto mb-2">
                The business you're looking for might have been moved, deleted,
                or is currently awaiting approval.
              </p>
              {error && (
                <p className="text-rose-500 text-xs font-mono bg-rose-50 p-2 rounded-lg inline-block">
                  Error: {error}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/search"
                className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95"
              >
                <Search className="w-5 h-5" /> Browse Businesses
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" /> Go Back Home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Check if current logged-in user is the owner of this business.
  // STRICT: Both sides must be non-null, non-empty strings before comparing.
  // Prevents false positives from `undefined === undefined` when API fields are missing.
  const currentUserId = user?.id;
  const vendorUserId = business.vendor?.userId || business.vendor?.user?.id;
  const isOwner = !!(
    currentUserId &&
    vendorUserId &&
    typeof currentUserId === "string" &&
    typeof vendorUserId === "string" &&
    currentUserId === vendorUserId
  );

  const imagePaths = new Set(
    [business.coverImageUrl, ...(business.images || [])].filter(Boolean),
  );

  const actualImages = Array.from(imagePaths)
    .map((img) => getImageUrl(img))
    .filter(Boolean) as string[];

  const defaultImages = [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=600",
  ];

  const galleryImages = actualImages.length > 0 ? actualImages : defaultImages;

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setShowLightbox(true);
  };

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex(
      (prev) => (prev - 1 + galleryImages.length) % galleryImages.length,
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {business.status === "pending" && (
        <div className="bg-amber-50 border-y border-amber-100 py-3">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-3 text-amber-700">
            <Clock className="w-5 h-5 shrink-0" />
            <span className="text-sm font-black uppercase tracking-wider">
              Pending Approval
            </span>
            <span className="text-sm opacity-80 hidden sm:inline">
              | This listing is currently being reviewed by our team.
            </span>
          </div>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 py-6 border-b border-slate-100 flex items-center gap-2 text-sm text-slate-400">
        <Link href="/" className="hover:text-blue-600">
          Home
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link
          href={`/search?category=${business.category?.slug || ""}`}
          className="hover:text-blue-600"
        >
          {business.category?.name || "Category"}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-medium">{business.title}</span>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  {business.isVerified && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified Listing
                    </div>
                  )}
                  <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {business.category?.name || "Business"}
                  </div>
                  <VendorOnlineBadge
                    isOnline={business.vendor?.user?.isOnline}
                    lastActiveAt={business.vendor?.user?.lastActiveAt}
                    lastLogoutAt={business.vendor?.user?.lastLogoutAt}
                  />
                  <BusinessOpenBadge business={business} />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
                  {business.title}
                </h1>
                <div className="flex flex-wrap items-center gap-6 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-slate-900">
                      {business.averageRating || "New"}
                    </span>
                    <span className="text-sm">
                      ({business.totalReviews || 0} reviews)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <MapPin className="w-4 h-4 text-slate-400" />{" "}
                    {business.address}, {business.city}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleLike}
                  className={`p-3 border rounded-2xl transition-all ${isFavorite ? "bg-rose-50 border-rose-100 text-rose-500" : "border-slate-200 text-slate-400 hover:bg-slate-50"}`}
                >
                  <Heart
                    className={`w-5 h-5 ${isFavorite ? "fill-rose-500" : ""}`}
                  />
                </button>
                <button
                  onClick={handleShare}
                  className="p-3 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors relative"
                >
                  <Share2 className="w-5 h-5 text-slate-400" />
                  {copySuccess && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900 text-white text-[10px] rounded-lg whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
                      Link Copied!
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Gallery */}
            <div className="grid grid-cols-4 grid-rows-2 h-[500px] gap-4 mb-16 relative z-10">
              <div
                onClick={() => openLightbox(0)}
                className="col-span-2 row-span-2 rounded-[24px] overflow-hidden border border-slate-100 bg-slate-50 cursor-pointer group/outer relative"
              >
                <img
                  src={galleryImages[0]}
                  className="w-full h-full object-cover group-hover/outer:scale-105 transition-transform duration-700"
                  alt={business.title}
                />
                <div className="absolute inset-0 bg-black/0 group-hover/outer:bg-black/10 transition-colors duration-300" />
              </div>
              <div
                onClick={() => openLightbox(1)}
                className="col-span-2 row-span-1 rounded-[24px] overflow-hidden border border-slate-100 bg-slate-50 cursor-pointer group/outer relative"
              >
                <img
                  src={galleryImages[1]}
                  className="w-full h-full object-cover group-hover/outer:scale-105 transition-transform duration-700"
                  alt="Business interior"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/outer:bg-black/10 transition-colors duration-300" />
              </div>
              <div
                onClick={() => openLightbox(2)}
                className="col-span-1 row-span-1 rounded-[20px] overflow-hidden border border-slate-100 bg-slate-50 cursor-pointer group/outer relative"
              >
                <img
                  src={galleryImages[2]}
                  className="w-full h-full object-cover group-hover/outer:scale-105 transition-transform duration-700"
                  alt="Business storefront"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/outer:bg-black/10 transition-colors duration-300" />
              </div>
              <div
                onClick={() => openLightbox(3)}
                className="col-span-1 row-span-1 rounded-[20px] bg-slate-900 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-600 transition-all duration-300 group shadow-xl relative overflow-hidden"
              >
                {actualImages.length >= 4 && (
                  <>
                    <img
                      src={actualImages[3]}
                      className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-500 blur-[2px]"
                      alt="More photos"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 group-hover:bg-blue-600/40 transition-colors" />
                  </>
                )}
                <div className="relative z-10 flex flex-col items-center">
                  <Images className="w-5 h-5 text-white/50 mb-2 group-hover:scale-110 group-hover:text-white transition-all" />
                  <span className="text-white font-black uppercase tracking-[0.2em] text-[10px]">
                    {actualImages.length}{" "}
                    {actualImages.length === 1 ? "Photo" : "Photos"}
                  </span>
                  <span className="text-white/40 font-bold uppercase tracking-widest text-[8px] mt-1">
                    View All
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs / Content */}
            {(() => {
              const validFaqs =
                business.faqs?.filter((faq) => faq.question && faq.answer) ||
                [];
              return (
                <>
                  <div className="border-b border-slate-100 flex items-center gap-12 mb-10 overflow-x-auto scrollbar-hide">
                    {[
                      "Overview",
                      "Reviews",
                      "Amenities",
                      ...(business.hasOffer ? ["Offer / Deal"] : []),
                      ...(validFaqs.length > 0 ? ["FAQs"] : []),
                    ].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 text-sm font-bold tracking-wide border-b-2 transition-all whitespace-nowrap ${activeTab === tab ? "text-blue-600 border-blue-600" : "text-slate-400 border-transparent hover:text-slate-600"}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="min-h-[400px]">
                    <div
                      className={activeTab === "Overview" ? "block" : "hidden"}
                    >
                      <div className="prose prose-slate max-w-none animate-in fade-in duration-500">
                        <h3 className="text-2xl font-bold text-slate-900 mb-6 italic">
                          About {business.title}
                        </h3>
                        <p className="text-lg text-slate-600 leading-relaxed mb-8">
                          {business.description}
                        </p>

                        <div className="grid sm:grid-cols-2 gap-4 mt-12 mb-12">
                          {[
                            "Fast Delivery",
                            "Premium Support",
                            "Genuine Products",
                            "100% Satisfaction",
                          ].map((check) => (
                            <div
                              key={check}
                              className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100"
                            >
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              <span className="font-medium text-slate-800">
                                {check}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Detailed Map Section */}
                        <div className="mt-12 space-y-6">
                          <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <Navigation className="w-6 h-6 text-blue-600" />{" "}
                            Business Location
                          </h3>
                          <div className="relative h-[400px] rounded-[20px] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50 bg-slate-50">
                            {mapError ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                <div className="w-16 h-16 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mb-4">
                                  <MapPin className="w-8 h-8" />
                                </div>
                                <p className="font-bold text-slate-900">
                                  Map unavailable
                                </p>
                                <p className="text-sm text-slate-500 mt-1 max-w-xs">
                                  {business.address}, {business.city}
                                </p>
                              </div>
                            ) : !mapLoaded ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                  Loading Location ...
                                </p>
                              </div>
                            ) : null}
                            <div
                              ref={mapContainerRef}
                              className="w-full h-full"
                            />

                            {/* Floating Info Overlay */}
                            <div className="absolute bottom-6 left-6 right-6 md:w-80 p-6 bg-white/90 backdrop-blur-xl border border-white/20 rounded-[16px] shadow-2xl">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
                                  <MapPin className="w-6 h-6" />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-900 leading-tight mb-1">
                                    {business.address}
                                  </p>
                                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    {business.city}, {business.state}{" "}
                                    {business.pincode}
                                  </p>
                                  <button
                                    onClick={() =>
                                      window.open(
                                        `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`,
                                        "_blank",
                                      )
                                    }
                                    className="mt-3 flex items-center gap-2 text-blue-600 text-xs font-black uppercase tracking-widest hover:text-blue-700 transition-colors"
                                  >
                                    Get Directions{" "}
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className={activeTab === "Reviews" ? "block" : "hidden"}
                    >
                      <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-bold text-slate-900">
                            Customer Reviews
                          </h3>
                          {isOwner ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                              <ShieldCheck className="w-4 h-4 text-blue-500" />
                              <span className="text-xs font-bold text-blue-600">
                                Your Business
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowReviewModal(true)}
                              className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
                            >
                              Write a Review
                            </button>
                          )}
                        </div>

                        {comments.length > 0 ? (
                          <div className="space-y-6">
                            {comments.map((comment: any, idx: number) => (
                              <div
                                key={comment.id || `comment-${idx}`}
                                className="p-4 bg-white rounded-[16px] border border-slate-100 shadow-sm transition-all hover:shadow-md"
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-bold overflow-hidden shadow-inner">
                                      {comment.user?.avatarUrl ? (
                                        <img
                                          src={
                                            getImageUrl(
                                              comment.user.avatarUrl,
                                            ) as string
                                          }
                                          alt={comment.user.fullName || "User"}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        (
                                          comment.user?.fullName?.[0] || "U"
                                        ).toUpperCase()
                                      )}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-slate-900">
                                        {comment.user?.fullName || "Anonymous"}
                                      </h4>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        {[...Array(5)].map((_, i) => (
                                          <Star
                                            key={i}
                                            className={`w-3.5 h-3.5 ${i < (comment.rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
                                          />
                                        ))}
                                        <span className="text-[10px] text-slate-400 ml-2">
                                          {new Date(
                                            comment.createdAt,
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-slate-600 leading-relaxed italic">
                                  "{comment.comment}"
                                </p>

                                {/* Vendor Response (if any) */}
                                {comment.vendorResponse && (
                                  <div className="mt-6 p-5 bg-blue-50 rounded-3xl border border-blue-100 relative">
                                    <div className="absolute -top-3 left-6 px-3 py-1 bg-white border border-blue-100 rounded-lg shadow-sm">
                                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                        Vendor Response
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-700 font-medium leading-relaxed italic">
                                      "{comment.vendorResponse}"
                                    </p>
                                    {comment.vendorResponseAt && (
                                      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        <Clock className="w-3 h-3" />
                                        {new Date(
                                          comment.vendorResponseAt,
                                        ).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* User Replies */}
                                {comment.replies &&
                                  comment.replies.length > 0 && (
                                    <div className="mt-6 ml-4 sm:ml-8 space-y-4 border-l-2 border-slate-100 pl-4 sm:pl-6">
                                      {comment.replies.map((reply: any) => (
                                        <div
                                          key={reply.id}
                                          className="relative group"
                                        >
                                          <div className="flex items-center gap-3 mb-2">
                                            <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center text-violet-600 font-bold text-[10px] shadow-sm">
                                              {reply.user?.avatarUrl ? (
                                                <img
                                                  src={
                                                    getImageUrl(
                                                      reply.user.avatarUrl,
                                                    ) as string
                                                  }
                                                  alt={
                                                    reply.user.fullName ||
                                                    "User"
                                                  }
                                                  className="w-full h-full object-cover rounded-lg"
                                                />
                                              ) : (
                                                (
                                                  reply.user?.fullName?.[0] ||
                                                  "U"
                                                ).toUpperCase()
                                              )}
                                            </div>
                                            <div>
                                              <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                                                {reply.user?.fullName ||
                                                  "Anonymous"}
                                              </h5>
                                              <p className="text-[9px] text-slate-400 font-bold">
                                                {new Date(
                                                  reply.createdAt,
                                                ).toLocaleDateString()}
                                              </p>
                                            </div>
                                          </div>
                                          <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                            {reply.content}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                {/* Reply Action & Form */}
                                {isOwner && (
                                  <div className="mt-6 pt-4 border-t border-slate-50">
                                    {replyingTo === comment.id ? (
                                      <div className="animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between mb-3">
                                          <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest flex items-center gap-2">
                                            <MessageSquare className="w-3 h-3" />{" "}
                                            Replying to Review
                                          </span>
                                          <button
                                            onClick={() => setReplyingTo(null)}
                                            className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                        <textarea
                                          autoFocus
                                          value={replyContent}
                                          onChange={(e) =>
                                            setReplyContent(e.target.value)
                                          }
                                          placeholder="Write your reply..."
                                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-medium focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all placeholder:text-slate-300 resize-none"
                                          rows={3}
                                        />
                                        <div className="flex justify-end mt-3">
                                          <button
                                            onClick={() =>
                                              handleReplySubmit(comment.id)
                                            }
                                            disabled={
                                              submittingReply ||
                                              !replyContent.trim()
                                            }
                                            className="px-6 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20 active:scale-95 disabled:opacity-50"
                                          >
                                            {submittingReply
                                              ? "Posting..."
                                              : "Post Reply"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setReplyingTo(comment.id)}
                                        className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-violet-600 uppercase tracking-widest transition-colors group"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                        Reply to{" "}
                                        {comment.user?.fullName?.split(" ")[0] ||
                                          "User"}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-12 bg-slate-50 rounded-[20px] text-center border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                              <MessageSquare className="w-8 h-8 text-slate-300" />
                            </div>
                            <h4 className="font-bold text-slate-900 mb-2">
                              No reviews yet
                            </h4>
                            <p className="text-sm text-slate-500">
                              Be the first to share your experience with{" "}
                              {business.title}.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className={activeTab === "Amenities" ? "block" : "hidden"}
                    >
                      <div className="animate-in fade-in duration-500">
                        <h3 className="text-2xl font-bold text-slate-900 mb-8">
                          Business Amenities
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                          {business.businessAmenities &&
                            business.businessAmenities.length > 0
                            ? business.businessAmenities.map((item, idx) => (
                              <div
                                key={item.id || `amenity-${idx}`}
                                className="flex items-center gap-3"
                              >
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                  <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-slate-700">
                                  {item.amenity.name}
                                </span>
                              </div>
                            ))
                            : [
                              "Free WiFi",
                              "Parking Space",
                              "Accepts Cards",
                              "Air Conditioned",
                              "Wheelchair Access",
                              "Outdoor Seating",
                            ].map((item) => (
                              <div
                                key={item}
                                className="flex items-center gap-3"
                              >
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                  <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-slate-700">
                                  {item}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    <div
                      className={
                        activeTab === "Offer / Deal" ? "block" : "hidden"
                      }
                    >
                      <div className="animate-in fade-in duration-500">
                        <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                          <Tag className="w-6 h-6 text-orange-500" /> Offer /
                          Banner Ad
                        </h3>

                        {/* Banner image */}
                        {business.offerBannerUrl && (
                          <div className="rounded-[20px] overflow-hidden mb-6 h-52 sm:h-72">
                            <img
                              src={business.offerBannerUrl}
                              alt={business.offerTitle || "Offer Banner"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Offer card */}
                        <div className="relative p-8 bg-gradient-to-br from-orange-50 to-amber-50 rounded-[20px] border border-orange-100 overflow-hidden">
                          {/* Decorative blob */}
                          <div className="absolute -top-8 -right-8 w-40 h-40 bg-orange-100 rounded-full opacity-60" />
                          <div className="relative z-10">
                            {business.offerBadge && (
                              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 text-white rounded-full text-[11px] font-black uppercase tracking-widest mb-5 shadow-md shadow-orange-500/30">
                                <Zap className="w-3 h-3" />{" "}
                                {business.offerBadge}
                              </span>
                            )}
                            <h4 className="text-3xl font-black text-slate-900 mb-3 leading-tight">
                              {business.offerTitle || "Special Offer"}
                            </h4>
                            {business.offerDescription && (
                              <p className="text-slate-600 text-base leading-relaxed mb-6 max-w-2xl">
                                {business.offerDescription}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-4">
                              {!isOwner && (
                                <button
                                  onClick={openEnquiryModal}
                                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-black text-sm hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/25 active:scale-95"
                                >
                                  <Zap className="w-4 h-4" /> Enquire About This
                                  Offer
                                </button>
                              )}
                              {business.phone && (
                                <button
                                  onClick={() => handleContactIntent("call")}
                                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:border-orange-400 hover:text-orange-600 transition-all"
                                >
                                  <Phone className="w-4 h-4" /> Call to Claim
                                </button>
                              )}
                              {(business.whatsapp || business.phone) && (
                                <button
                                  onClick={() =>
                                    handleContactIntent("whatsapp")
                                  }
                                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#25D366] text-white rounded-2xl font-bold text-sm hover:bg-[#128C7E] transition-all shadow-lg shadow-green-500/20"
                                >
                                  <WhatsAppIcon className="w-5 h-5" /> WhatsApp
                                  Us
                                </button>
                              )}
                            </div>
                            {business.offerExpiresAt && (
                              <div className="flex items-center gap-2 mt-6 text-sm text-slate-500 font-medium">
                                <Calendar className="w-4 h-4 text-orange-400" />
                                <span>
                                  Offer valid until{" "}
                                  <strong className="text-orange-600">
                                    {new Date(
                                      business.offerExpiresAt,
                                    ).toLocaleDateString("en-US", {
                                      weekday: "long",
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric",
                                    })}
                                  </strong>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={activeTab === "FAQs" ? "block" : "hidden"}>
                      <div className="animate-in fade-in duration-500">
                        <h3 className="text-2xl font-bold text-slate-900 mb-8">
                          Frequently Asked Questions
                        </h3>
                        {validFaqs.length > 0 ? (
                          <div className="space-y-4">
                            {validFaqs.map((faq, idx) => (
                              <div
                                key={idx}
                                className="bg-slate-50 rounded-2xl p-6 border border-slate-100"
                              >
                                <h4 className="font-bold text-slate-900 text-lg mb-2">
                                  {faq.question}
                                </h4>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                                  {faq.answer}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500">
                            No FAQs available for this business.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* end min-h-[400px] */}
                </>
              );
            })()}
          </div>
          {/* end lg:col-span-2 */}

          {/* Sidebar Area */}
          <aside>
            <div className="sticky top-28 space-y-8">
              {/* Actions/Contact Card */}
              <div className="bg-slate-900 rounded-[16px] p-8 text-white shadow-2xl shadow-blue-500/20">
                <h4 className="text-xl font-bold mb-6">
                  Connect with Business
                </h4>

                <div className="space-y-4 mb-4">
                  {business.phone && (
                    <button
                      onClick={() => handleContactIntent("call")}
                      className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-100 transition-all"
                    >
                      <Phone className="w-5 h-5" /> Call Now
                    </button>
                  )}
                  {(business.whatsapp || business.phone) && (
                    <button
                      onClick={() => handleContactIntent("whatsapp")}
                      className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-extrabold flex items-center justify-center gap-3 hover:bg-[#128C7E] transition-all shadow-lg shadow-green-500/10"
                    >
                      <WhatsAppIcon className="w-6 h-6" /> WhatsApp Express
                    </button>
                  )}
                </div>

                {/* Live Chat Button */}
                {!isOwner && (
                  <ChatTrigger
                    ref={chatRef}
                    businessId={business.id}
                    businessName={business.title}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10 active:scale-95 mb-4"
                  />
                )}

                {/* Quick Connect/Enquiry Button - Now opens Live Chat */}
                {!isOwner && (
                  <button
                    id="send-enquiry-btn"
                    onClick={() => handleContactIntent("enquiry")}
                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:from-violet-700 hover:to-blue-700 transition-all shadow-lg shadow-violet-500/20 active:scale-95"
                  >
                    <Send className="w-5 h-5" /> Chat Now & Enquire
                  </button>
                )}
                {isOwner && (
                  <div className="w-full py-3 bg-blue-900/30 border border-blue-700/30 text-blue-300 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm">
                    <ShieldCheck className="w-4 h-4" /> You own this listing
                  </div>
                )}

                <div className="pt-8 border-t border-white/10 space-y-4">
                  <div className="space-y-3">
                    {(() => {
                      if (
                        !business.businessHours ||
                        business.businessHours.length === 0
                      )
                        return null;
                      const today = new Date()
                        .toLocaleDateString("en-US", { weekday: "long" })
                        .toLowerCase();
                      const hour = business.businessHours.find(
                        (h) => h.dayOfWeek.toLowerCase() === today,
                      );

                      return (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3 text-slate-400">
                            <Clock className="w-4 h-4" />
                            Open Today
                          </div>
                          <span
                            className={`font-bold ${hour?.isOpen ? "text-white" : "text-rose-400"}`}
                          >
                            {hour
                              ? hour.isOpen
                                ? `${hour.openTime} - ${hour.closeTime}`
                                : "Closed"
                              : "N/A"}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {business.website && (
                    <div className="flex items-center justify-between text-sm pt-4 border-t border-white/5">
                      <div className="flex items-center gap-3 text-slate-400">
                        <Globe className="w-4 h-4" /> Website
                      </div>
                      <a
                        href={
                          business.website.startsWith("http")
                            ? business.website
                            : `https://${business.website}`
                        }
                        target="_blank"
                        className="font-bold border-b border-blue-400 text-blue-400"
                      >
                        Visit Site
                      </a>
                    </div>
                  )}
                  {/* Dynamic Social Links */}
                  {(() => {
                    const validLinks = (
                      business.vendor?.socialLinks || []
                    ).filter(
                      (link) =>
                        link &&
                        typeof link === "object" &&
                        !Array.isArray(link) &&
                        link.url,
                    );

                    if (validLinks.length === 0) return null;

                    return (
                      <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center gap-3 text-slate-400 text-sm mb-3">
                          Social Media
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {validLinks.map((link, idx) => {
                            let platform = (link.platform || "").toLowerCase();

                            // Infer platform from URL if missing
                            if (!platform) {
                              const url = link.url.toLowerCase();
                              if (url.includes("facebook"))
                                platform = "facebook";
                              else if (
                                url.includes("twitter") ||
                                url.includes("x.com")
                              )
                                platform = "twitter";
                              else if (url.includes("instagram"))
                                platform = "instagram";
                              else if (url.includes("linkedin"))
                                platform = "linkedin";
                              else if (url.includes("youtube"))
                                platform = "youtube";
                              else if (
                                url.includes("wa.me") ||
                                url.includes("whatsapp")
                              )
                                platform = "whatsapp";
                              else platform = "website";
                            }

                            let Icon = LinkIcon;
                            let colorClass =
                              "bg-slate-800 hover:bg-slate-700 text-white";

                            if (platform.includes("facebook")) {
                              Icon = Facebook;
                              colorClass =
                                "bg-[#1877F2]/20 text-[#1877F2] hover:bg-[#1877F2]/30";
                            } else if (
                              platform.includes("twitter") ||
                              platform.includes("x")
                            ) {
                              Icon = Twitter;
                              colorClass =
                                "bg-slate-800 text-white hover:bg-slate-700";
                            } else if (platform.includes("instagram")) {
                              Icon = Instagram;
                              colorClass =
                                "bg-[#E4405F]/20 text-[#E4405F] hover:bg-[#E4405F]/30";
                            } else if (platform.includes("linkedin")) {
                              Icon = Linkedin;
                              colorClass =
                                "bg-[#0A66C2]/20 text-[#0A66C2] hover:bg-[#0A66C2]/30";
                            } else if (platform.includes("youtube")) {
                              Icon = Youtube;
                              colorClass =
                                "bg-[#FF0000]/20 text-[#FF0000] hover:bg-[#FF0000]/30";
                            } else if (platform.includes("whatsapp")) {
                              Icon = MessageSquare;
                              colorClass =
                                "bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30";
                            }

                            return (
                              <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-2.5 rounded-xl transition-all ${colorClass}`}
                                title={
                                  link.platform ||
                                  platform.charAt(0).toUpperCase() +
                                  platform.slice(1)
                                }
                              >
                                <Icon className="w-4 h-4" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Business Profile / Vendor Profile Card */}
              <div className="bg-white rounded-[20px] p-8 border border-slate-100 shadow-sm transition-all hover:shadow-md">
                <h4 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <User className="w-5 h-5 text-blue-600" /> Business Profile
                </h4>

                <div className="flex flex-col items-center text-center">
                  <Link
                    href={`/vendors/${business.vendor?.id || business.vendorId}`}
                    className="flex flex-col items-center text-center group/vendor cursor-pointer"
                  >
                    <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 font-bold overflow-hidden shadow-inner mb-4 relative group">
                      {business.vendor?.user?.avatarUrl ? (
                        <img
                          src={
                            getImageUrl(
                              business.vendor.user.avatarUrl,
                            ) as string
                          }
                          alt={business.vendor.user.fullName || "Vendor"}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <span className="text-2xl">
                          {(
                            business.vendor?.user?.fullName?.[0] || "V"
                          ).toUpperCase()}
                        </span>
                      )}
                      {business.vendor?.user?.isOnline && (
                        <div className="absolute bottom-1 right-1 w-4.5 h-4.5 bg-emerald-500 border-[3px] border-white rounded-full shadow-sm" />
                      )}
                    </div>

                    <h5 className="text-lg font-black text-slate-900 leading-tight mb-1 group-hover/vendor:text-blue-600 transition-colors">
                      {business.vendor?.user?.fullName ||
                        "Verified Business Owner"}
                    </h5>
                  </Link>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">
                      <ShieldCheck className="w-3 h-3" /> Verified Vendor
                    </span>
                  </div>

                  {/* Status & Followers Section */}
                  <div className="w-full grid grid-cols-2 gap-3 mb-6">
                    <div className="">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Availability
                      </div>
                      <VendorOnlineBadge
                        isOnline={business.vendor?.user?.isOnline}
                      />
                    </div>
                    <div className="">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Status
                      </div>
                      <BusinessOpenBadge business={business} />
                    </div>
                  </div>

                  <div className="w-full mb-6">
                    <FollowButton
                      businessId={business.id}
                      initialFollowersCount={business.followersCount}
                      className="w-full"
                    />
                  </div>

                  <div className="w-full pt-6 border-t border-slate-100 space-y-4 text-left">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">
                        Member since
                      </span>
                      <span className="font-black text-slate-900">
                        {business.vendor?.user?.createdAt
                          ? new Date(
                            business.vendor.user.createdAt,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })
                          : "Oct 2024"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">
                        Working Hours
                      </span>
                      <span className="font-black text-slate-900">
                        {(() => {
                          // Check if vendor logged in today
                          const lastLogin = business.vendor?.user?.lastLoginAt;
                          if (lastLogin) {
                            const loginDate = new Date(lastLogin);
                            const today = new Date();
                            if (
                              loginDate.toDateString() === today.toDateString()
                            ) {
                              return `Today at ${loginDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
                            }
                          }

                          // Fallback to business hours
                          const hoursData =
                            business.businessHours &&
                              business.businessHours.length > 0
                              ? business.businessHours
                              : business.vendor?.businessHours;
                          const { todayHours } =
                            getBusinessOpenStatus(hoursData);
                          return todayHours || "Closed";
                        })()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">
                        {/* Response Rate */}
                      </span>
                      <span className="font-black text-emerald-600">
                        {/* 98% High */}
                      </span>
                    </div>

                    <Link
                      id="view-vendor-profile-btn"
                      href={`/vendors/${business.vendor?.id || business.vendorId}`}
                      className="block w-full py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-sm text-center hover:bg-slate-900 hover:text-white transition-all border border-slate-100 shadow-sm"
                      onClick={() => {
                        console.log(
                          "[BusinessDetailClient] Navigating to vendor profile:",
                          business.vendor?.id || business.vendorId,
                        );
                      }}
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ── Special Offers & Events ─────────────────────────────────────────── */}
      {offers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Special Offers & Events
              </h2>
              <p className="text-sm text-slate-400 font-medium">
                Exclusive deals from {business.title}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {offers.map((offer: any, idx: number) => (
              <div
                key={offer.id || `offer-${idx}`}
                className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* Offer Banner Image */}
                {offer.imageUrl && (
                  <div className="h-40 overflow-hidden bg-slate-100">
                    <img
                      src={offer.imageUrl}
                      alt={offer.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                {/* Top accent stripe */}
                {!offer.imageUrl && (
                  <div
                    className={`h-1.5 w-full ${offer.type === "event" ? "bg-gradient-to-r from-blue-500 to-indigo-500" : "bg-gradient-to-r from-orange-500 to-rose-500"}`}
                  />
                )}

                <div className="p-6 flex flex-col flex-1 gap-3">
                  {/* Badge */}
                  {offer.offerBadge && (
                    <span className="self-start px-3 py-1.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-black rounded-xl shadow-sm shadow-orange-500/30">
                      {offer.offerBadge}
                    </span>
                  )}

                  {/* Type chip */}
                  <span
                    className={`self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${offer.type === "event"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-orange-50 text-orange-600"
                      }`}
                  >
                    {offer.type === "event" ? (
                      <Calendar className="w-3 h-3" />
                    ) : (
                      <Tag className="w-3 h-3" />
                    )}
                    {offer.type}
                  </span>

                  <h3 className="font-black text-slate-900 text-lg leading-tight">
                    {offer.title}
                  </h3>

                  {offer.description && (
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
                      {offer.description}
                    </p>
                  )}

                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    {offer.expiryDate ? (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        Valid until{" "}
                        {new Date(offer.expiryDate).toLocaleDateString(
                          "en-US",
                          { day: "2-digit", month: "short", year: "numeric" },
                        )}
                      </div>
                    ) : (
                      <span />
                    )}

                    <button
                      onClick={openEnquiryModal}
                      className="px-4 py-2 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-orange-500 transition-all group-hover:scale-105 active:scale-95"
                    >
                      Enquire
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <Footer />

      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[16px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setShowReviewModal(false)}
              className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="text-center mb-8">
              <h3 className="text-3xl font-black text-slate-900 mb-2">
                Write a Review
              </h3>
              <p className="text-slate-500">
                Share your experience with {business.title}
              </p>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-6">
              <div className="flex flex-col items-center">
                <label className="block text-sm font-bold text-slate-700 mb-4">
                  How was your experience?
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 transition-transform hover:scale-110 active:scale-90"
                    >
                      <Star
                        className={`w-10 h-10 ${star <= reviewRating ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Your review
                </label>
                <textarea
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  placeholder="Tell others what you liked or disliked..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 text-slate-600"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Enquiry Modal */}
      <AnimatePresence>
        {showEnquiryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-lg rounded-[16px] shadow-2xl relative overflow-hidden"
            >
              {/* Header gradient bar */}
              {/* <div className="h-2 w-full bg-gradient-to-r from-violet-500 via-blue-500 to-indigo-500" /> */}

              <div className="p-8">
                <button
                  onClick={() => setShowEnquiryModal(false)}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors p-1 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>

                {enquirySuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-8 text-center"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10 text-violet-600" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">
                      Enquiry Sent!
                    </h3>
                    <p className="text-slate-500">
                      The business owner will get back to you soon.
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center">
                          <Send className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-900">
                            Send Enquiry
                          </h3>
                          <p className="text-sm text-slate-400">
                            to {business?.title}
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleEnquirySubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                            Full Name *
                          </label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                              id="enquiry-name"
                              type="text"
                              required
                              value={enquiryName}
                              onChange={(e) => setEnquiryName(e.target.value)}
                              placeholder="Your name"
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all placeholder:text-slate-300"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                            Email *
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                              id="enquiry-email"
                              type="email"
                              required
                              value={enquiryEmail}
                              onChange={(e) => setEnquiryEmail(e.target.value)}
                              placeholder="your@email.com"
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all placeholder:text-slate-300"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                          Phone{" "}
                          <span className="normal-case font-medium text-slate-300">
                            (optional)
                          </span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input
                            id="enquiry-phone"
                            type="tel"
                            value={enquiryPhone}
                            onChange={(e) => setEnquiryPhone(e.target.value)}
                            placeholder="+60 123 456 7890"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all placeholder:text-slate-300"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                          Your Message *
                        </label>
                        <textarea
                          id="enquiry-message"
                          required
                          value={enquiryMessage}
                          onChange={(e) => setEnquiryMessage(e.target.value)}
                          rows={4}
                          placeholder="Hi, I'd like to enquire about your services..."
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all placeholder:text-slate-300 resize-none"
                        />
                      </div>

                      {enquiryError && (
                        <div className="px-4 py-3 bg-rose-50 border border-rose-100 rounded-2xl text-sm text-rose-600 font-medium">
                          {enquiryError}
                        </div>
                      )}

                      <button
                        type="submit"
                        id="enquiry-submit-btn"
                        disabled={submittingEnquiry}
                        className="w-full py-4 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:from-violet-700 hover:to-blue-700 transition-all shadow-lg shadow-violet-500/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                      >
                        {submittingEnquiry ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" /> Send Enquiry
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Lightbox Slider */}
      <AnimatePresence>
        {showLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
            onClick={() => setShowLightbox(false)}
          >
            <button
              className="absolute top-6 right-6 z-[110] w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all border border-white/10"
              onClick={() => setShowLightbox(false)}
            >
              <X className="w-6 h-6" />
            </button>

            <div
              className="relative w-full max-w-5xl aspect-video md:aspect-[16/9] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute left-0 -translate-x-full md:-translate-x-20 z-[110] w-14 h-14 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all border border-white/10"
                onClick={prevImage}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentImageIndex}
                  initial={{ opacity: 0, scale: 0.95, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: -20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="w-full h-full rounded-[20px] overflow-hidden border border-white/10 shadow-2xl"
                >
                  <img
                    src={galleryImages[currentImageIndex]}
                    className="w-full h-full object-contain bg-black/50"
                    alt="Gallery selection"
                  />
                </motion.div>
              </AnimatePresence>

              <button
                className="absolute right-0 translate-x-full md:translate-x-20 z-[110] w-14 h-14 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all border border-white/10"
                onClick={nextImage}
              >
                <ChevronRight className="w-8 h-8" />
              </button>

              {/* Thumbnails Indicator */}
              <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex gap-3">
                {galleryImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === currentImageIndex ? "bg-blue-500 w-8" : "bg-white/20 hover:bg-white/40"}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-md rounded-[16px] shadow-2xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" /> */}

              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight">
                      Share Listing
                    </h3>
                    <p className="text-sm text-slate-400 font-medium">
                      Spreading the word about {business?.title}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-full hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-8">
                  {[
                    {
                      name: "WhatsApp",
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                      ),
                      color: "bg-[#25D366]",
                      url: `https://wa.me/?text=Check out ${business?.title} on Local Business Listing: ${window.location.href}`,
                    },
                    {
                      name: "Facebook",
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      ),
                      color: "bg-[#1877F2]",
                      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
                    },
                    {
                      name: "Twitter",
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                        </svg>
                      ),
                      color: "bg-black",
                      url: `https://twitter.com/intent/tweet?text=Check out ${business?.title}&url=${encodeURIComponent(window.location.href)}`,
                    },
                    {
                      name: "LinkedIn",
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      ),
                      color: "bg-[#0A66C2]",
                      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
                    },
                  ].map((platform) => (
                    <a
                      key={platform.name}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div
                        className={`w-16 h-16 ${platform.color} text-white rounded-[20px] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300`}
                      >
                        {platform.icon}
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        {platform.name}
                      </span>
                    </a>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={window.location.href}
                      className="w-full pl-4 pr-24 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-500 outline-none"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="absolute right-2 top-2 bottom-2 px-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors"
                    >
                      {copySuccess ? "Copied!" : "Copy Link"}
                    </button>
                  </div>

                  <a
                    href={`mailto:?subject=Check out ${business?.title}&body=I found this business on Local Listings: ${window.location.href}`}
                    className="w-full py-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center gap-3 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-all"
                  >
                    <Mail className="w-4 h-4" /> Share via Email
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
