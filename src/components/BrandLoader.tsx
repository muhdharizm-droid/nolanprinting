"use client";

import React from "react";
import Image from "next/image";

interface BrandLoaderProps {
  message?: string;
  submessage?: string;
  fullScreen?: boolean;
}

export default function BrandLoader({
  message = "Loading Nolan Printing...",
  submessage = "Preparing workspace & synchronizing records",
  fullScreen = true,
}: BrandLoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 text-center select-none animate-fade-in p-6">
      {/* Animated Brand Emblem */}
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ambient halo */}
        <div className="absolute -inset-3 bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-cyan-500/30 rounded-3xl blur-xl animate-pulse" />

        {/* Spinning gradient ring */}
        <div className="relative w-20 h-20 rounded-2xl p-[3px] bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 animate-spin shadow-lg shadow-blue-500/10">
          <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[13px]" />
        </div>

        {/* Nolan Printing Logo */}
        <div className="absolute w-14 h-14 rounded-xl overflow-hidden shadow-inner bg-white">
          <Image
            src="/images/logo.jpeg"
            alt="Nolan Printing"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Text Info */}
      <div className="space-y-1.5 mt-1">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">
          {message}
        </h3>
        {submessage && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs">
            {submessage}
          </p>
        )}
      </div>

      {/* 3 Animated Bouncing Pulse Dots */}
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/85 dark:bg-slate-950/85 backdrop-blur-md transition-all duration-300">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full py-16 flex items-center justify-center">
      {content}
    </div>
  );
}

