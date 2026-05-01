"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  Home,
  LayoutGrid,
  Info,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Settings,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  MinusSquare,
  Tag,
  Calendar,
  Layout,
} from "lucide-react";
import { api } from "../../../lib/api";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

type Placement = "homepage" | "category" | "listing";

interface PricingRule {
  id: string;
  placement: Placement | string;
  pricePerHour: number;
  pricePerDay: number;
  isActive: boolean;
}

const ALLOWED_PLACEMENTS: Placement[] = ["homepage", "category", "listing"];

const PLACEMENT_INFO: Record<
  Placement,
  {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    lightColor: string;
    textColor: string;
    borderColor: string;
  }
> = {
  homepage: {
    title: "Home Page",
    description:
      "Boost listings to the prime hero section and search foreground.",
    icon: Home,
    color: "bg-orange-500",
    lightColor: "bg-orange-50",
    textColor: "text-orange-600",
    borderColor: "border-orange-100",
  },
  category: {
    title: "Category Page",
    description:
      "Ensure visibility at the top of specific business categories.",
    icon: LayoutGrid,
    color: "bg-blue-600",
    lightColor: "bg-blue-50",
    textColor: "text-blue-600",
    borderColor: "border-blue-100",
  },
  listing: {
    title: "Listing Boost",
    description:
      'Appear in "Suggested" and "Similar" sections of competitor pages.',
    icon: Zap,
    color: "bg-violet-600",
    lightColor: "bg-violet-50",
    textColor: "text-violet-600",
    borderColor: "border-violet-100",
  },
};

// const PLACEMENT_INFO = {
//   homepage: {
//     title: "Home Page Spotlight",
//     description:
//       "Boost listings to the prime hero section and search foreground.",
//     icon: Home,
//     color: "bg-orange-500",
//     lightColor: "bg-orange-50",
//     textColor: "text-orange-600",
//     borderColor: "border-orange-100",
//   },
//   category: {
//     title: "Category Dominance",
//     description:
//       "Ensure visibility at the top of specific business categories.",
//     icon: LayoutGrid,
//     color: "bg-blue-600",
//     lightColor: "bg-blue-50",
//     textColor: "text-blue-600",
//     borderColor: "border-blue-100",
//   },
//   listing: {
//     title: "Related Listings",
//     description:
//       'Appear in "Suggested" and "Similar" sections of competitor pages.',
//     icon: Zap,
//     color: "bg-violet-600",
//     lightColor: "bg-violet-50",
//     textColor: "text-violet-600",
//     borderColor: "border-violet-100",
//   },
//   offer: {
//     title: "Offer Boost",
//     description:
//       "Set baseline for time-limited deal promotions across the app.",
//     icon: Tag,
//     color: "bg-emerald-600",
//     lightColor: "bg-emerald-50",
//     textColor: "text-emerald-700",
//     borderColor: "border-emerald-100",
//   },
//   event: {
//     title: "Event Promotion",
//     description:
//       "Control baseline cost for increasing event and workshop reach.",
//     icon: Calendar,
//     color: "bg-rose-600",
//     lightColor: "bg-rose-50",
//     textColor: "text-rose-700",
//     borderColor: "border-rose-100",
//   },
//   page: {
//     title: "Page Highlight",
//     description: "Dynamic price for highlighting entire business pages.",
//     icon: Layout,
//     color: "bg-indigo-600",
//     lightColor: "bg-indigo-50",
//     textColor: "text-indigo-700",
//     borderColor: "border-indigo-100",
//   },
// };

export default function PromotionRulesPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const data = await api.get<PricingRule[]>("/promotions/admin/rules");
      setRules(data);
    } catch (error) {
      toast.error("Failed to load pricing rules");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<PricingRule>) => {
    setSavingId(id);
    try {
      const updated = await api.patch<PricingRule>(
        `/promotions/admin/rules/${id}`,
        updates,
      );
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success("System parameters updated successfully");
    } catch (error) {
      toast.error("Failed to sync changes");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-red-500" />
          <p className="text-slate-400 font-bold animate-pulse">
            Syncing Monetization Rules...
          </p>
        </div>
      </div>
    );
  }

  //   const activeRules = rules.filter((r) => r.isActive).length;
  //   const avgRate =
  //     rules.length > 0
  //       ? Math.round(
  //           rules.reduce((acc, curr) => acc + Number(curr.pricePerHour), 0) /
  //             rules.length,
  //         )
  //       : 0;
  const visibleRules = rules.filter(
    (rule): rule is PricingRule & { placement: Placement } =>
      ALLOWED_PLACEMENTS.includes(rule.placement as Placement),
  );

  const activeRules = visibleRules.filter((r) => r.isActive).length;
  const avgRate =
    visibleRules.length > 0
      ? Math.round(
          visibleRules.reduce(
            (acc, curr) => acc + Number(curr.pricePerHour),
            0,
          ) / visibleRules.length,
        )
      : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-32">
      {/* Header Dashboard */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[20px] p-8 md:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl -mr-48 -mt-48" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/40">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
                Monetization Engine
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none">
              Promotion Boost Pricing
            </h1>
            <p className="text-slate-400 font-bold text-lg max-w-md">
              Configure global hourly rates for vendor promotions and set
              placement visibility.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                Active Zones
              </div>
              <div className="text-3xl font-black">
                {/* {activeRules} / {rules.length} */}
                {activeRules} / {visibleRules.length}
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                Avg. Hourly Rate
              </div>
              <div className="text-3xl font-black">
                {avgRate}{" "}
                <span className="text-sm text-slate-500 tracking-normal text-slate-500 font-normal">
                  PKR
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Form Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
            Placement Controls
            <div className="h-1 w-12 bg-red-500 rounded-full" />
          </h2>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Dynamic Pricing V2.0
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* {rules.map((rule) => {
            const info =
              PLACEMENT_INFO[rule.placement as keyof typeof PLACEMENT_INFO] ||
              PLACEMENT_INFO.listing;
            const isSaving = savingId === rule.id; */}
          {visibleRules.map((rule) => {
            const info = PLACEMENT_INFO[rule.placement];
            const isSaving = savingId === rule.id;

            return (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative bg-white rounded-[20px] overflow-hidden border-2 transition-all duration-500 ${rule.isActive ? "border-slate-50 shadow-xl hover:shadow-2xl hover:scale-[1.02]" : "border-slate-100 opacity-60 grayscale"}`}
              >
                {/* Placement Header */}
                <div className={`${info.lightColor} p-8 relative`}>
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() =>
                        handleUpdate(rule.id, { isActive: !rule.isActive })
                      }
                      className={`p-2 rounded-xl transition-all ${rule.isActive ? "bg-emerald-500 text-white shadow-lg" : "bg-slate-200 text-slate-400"}`}
                    >
                      <ShieldCheck className="w-5 h-5" />
                    </button>
                  </div>
                  <div
                    className={`w-16 h-16 rounded-[20px] ${info.color} flex items-center justify-center text-white shadow-xl mb-6 group-hover:rotate-6 transition-all duration-300`}
                  >
                    <info.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2 leading-none">
                    {info.title}
                  </h3>
                  <p className="text-sm font-bold text-slate-500 leading-relaxed font-semibold">
                    {info.description}
                  </p>
                </div>

                {/* Pricing Controls */}
                <div className="p-8 space-y-8">
                  <div className="space-y-6">
                    {/* Hourly Boost Rate */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                          Hourly Boost Rate
                        </label>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">
                          Automated Multiplier
                        </span>
                      </div>
                      <div className="relative">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-extrabold text-xl">
                          Rs
                        </div>
                        <input
                          type="number"
                          defaultValue={rule.pricePerHour}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (val !== rule.pricePerHour)
                              handleUpdate(rule.id, { pricePerHour: val });
                          }}
                          className="w-full px-8 py-3 pr-20 pl-16 bg-slate-50 border-2 border-transparent rounded-[24px] focus:outline-none focus:border-red-500 focus:bg-white transition-all font-black text-2xl text-slate-900 placeholder:text-slate-200 shadow-inner"
                          placeholder="0"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs uppercase tracking-widest">
                          / Hr
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Footnote */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Estimated Daily
                      </span>
                      <span className="text-lg font-black text-slate-900">
                        Rs {Number(rule.pricePerHour) * 24}
                      </span>
                    </div>
                    <button
                      disabled={isSaving}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${isSaving ? "bg-slate-100" : "bg-slate-900 text-white hover:bg-black shadow-xl"}`}
                    >
                      {isSaving ? (
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                      ) : (
                        <Save className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* {rules.length === 0 && ( */}
          {visibleRules.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-[20px] border-2 border-dashed border-slate-100">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                <MinusSquare className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">
                No Rules Initialized
              </h3>
              <p className="text-slate-300 font-bold max-w-xs text-center mt-2 leading-tight">
                The monetization engine hasn't populated placement rules yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Strategy Insight */}
      {/* <div className="bg-emerald-50 rounded-[20px] p-10 border-2 border-emerald-100/50 flex flex-col md:flex-row items-center gap-8">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <TrendingUp className="w-10 h-10 text-emerald-600" />
                </div>
                <div className="space-y-4 text-center md:text-left">
                    <h4 className="text-2xl font-extrabold text-emerald-900">Monetization intelligence</h4>
                    <p className="text-emerald-700 font-medium text-lg leading-snug">
                        The above prices are your global baseline. Vendors on **Diamond** or **Platinum** tiers receive discounted rates based on their plan settings, incentivizing high-tier subscriptions.
                    </p>
                </div>
            </div> */}
    </div>
  );
}
