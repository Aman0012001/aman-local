"use client";

import React from "react";
import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded" | "premium-card";
}

export default function Skeleton({ className = "", variant = "rectangular" }: SkeletonProps) {
  const getBaseClass = () => {
    switch (variant) {
      case "text":
        return "h-4 w-full rounded-md";
      case "circular":
        return "rounded-full";
      case "rounded":
        return "rounded-2xl";
      case "premium-card":
        return " rounded-[15px]";
      default:
        return "rounded-lg";
    }
  };

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 ${getBaseClass()} ${className}`}
    >
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white  rounded-[15px] border border-slate-50 p-6 space-y-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Skeleton variant="rounded" className="w-14 h-14" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-3/4 h-5" />
          <Skeleton variant="text" className="w-1/2 h-3" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-2/3 h-4" />
      </div>
      <div className="pt-4 flex gap-3">
        <Skeleton variant="rounded" className="flex-1 h-12" />
        <Skeleton variant="rounded" className="w-12 h-12" />
      </div>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 flex items-center gap-4">
      <Skeleton variant="rounded" className="w-12 h-12" />
      <div className="space-y-2">
        <Skeleton variant="text" className="w-16 h-3" />
        <Skeleton variant="text" className="w-24 h-8" />
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 bg-white border border-slate-50 rounded-2xl">
          <Skeleton variant="rounded" className="w-10 h-10" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-1/3 h-4" />
            <Skeleton variant="text" className="w-1/4 h-3" />
          </div>
          <Skeleton variant="rounded" className="w-20 h-8" />
        </div>
      ))}
    </div>
  );
}
