"use client";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] text-slate-900 dark:text-white flex items-center justify-center p-4 overflow-hidden">

        {/* Ambient glow */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[#7c6cfc]/6 rounded-full blur-[120px]"/>
        </div>

        <div className="relative z-10 text-center max-w-lg w-full"
          style={{ animation: "fadeUp 0.5s ease", animationFillMode: "both" }}>

          {/* 404 number */}
          <div className="relative mb-8 select-none">
            <p className="font-display font-bold text-[clamp(100px,22vw,180px)] leading-none text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #7c6cfc 0%, #a78bfa 50%, #7c6cfc80 100%)" }}>
              404
            </p>
          </div>

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-[#7c6cfc]/10 border border-[#7c6cfc]/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#7c6cfc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/>
            </svg>
          </div>

          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white mb-3">
            Page Not Found
          </h1>
          <p className="font-body text-slate-500 dark:text-white/45 text-sm sm:text-base leading-relaxed mb-8 max-w-sm mx-auto">
            This page doesn't exist or may have been moved. Let's get you back to somewhere useful.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/dashboard"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7c6cfc] hover:bg-[#6a5cf0] text-white font-body font-medium text-sm transition-all shadow-lg shadow-[#7c6cfc]/25 w-full sm:w-auto justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
              Go to Dashboard
            </Link>
            <Link href="/"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 font-body font-medium text-sm transition-all w-full sm:w-auto justify-center">
              Back to Home
            </Link>
          </div>

          {/* Helpful links */}
          <div className="mt-10 pt-8 border-t border-slate-200 dark:border-white/[0.07]">
            <p className="font-mono text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-wider mb-4">
              Or try one of these
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { href: "/dashboard",   label: "Dashboard"   },
                { href: "/domains",     label: "Simulations" },
                { href: "/leaderboard", label: "Leaderboard" },
                { href: "/badges",      label: "Badges"      },
                { href: "/analytics",   label: "Analytics"   },
              ].map(link => (
                <Link key={link.href} href={link.href}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:border-[#7c6cfc]/40 font-body text-xs transition-all">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}