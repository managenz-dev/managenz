"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in dev — swap for Sentry/LogRocket in production
    console.error("Runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] text-slate-900 dark:text-white flex items-center justify-center p-4 overflow-hidden">

      {/* Ambient glow — rose tint for errors */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-rose-500/5 rounded-full blur-[100px]"/>
      </div>

      <div className="relative z-10 text-center max-w-lg w-full" style={{ animation: "fadeUp 0.5s ease" }}>

        {/* Error icon */}
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 mb-5">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"/>
          <span className="font-mono text-[10px] text-rose-400 uppercase tracking-wider">Something went wrong</span>
        </div>

        <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white mb-3">
          Unexpected Error
        </h1>
        <p className="font-body text-slate-500 dark:text-white/45 text-sm sm:text-base leading-relaxed mb-2 max-w-sm mx-auto">
          Something went wrong on this page. This has been noted.
        </p>

        {/* Error digest — helpful for debugging */}
        {error?.digest && (
          <p className="font-mono text-[10px] text-slate-400 dark:text-white/20 mb-8">
            Error ID: {error.digest}
          </p>
        )}
        {!error?.digest && <div className="mb-8"/>}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={reset}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7c6cfc] hover:bg-[#6a5cf0] text-white font-body font-medium text-sm transition-all shadow-lg shadow-[#7c6cfc]/25 w-full sm:w-auto justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Try Again
          </button>
          <Link href="/dashboard"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 font-body font-medium text-sm transition-all w-full sm:w-auto justify-center">
            Go to Dashboard
          </Link>
        </div>

        {/* Dev details — only shown in development */}
        {process.env.NODE_ENV === "development" && error?.message && (
          <div className="mt-8 text-left rounded-xl bg-rose-500/5 border border-rose-500/15 p-4 overflow-auto max-h-36">
            <p className="font-mono text-[10px] text-rose-400 uppercase tracking-wider mb-2">Dev info</p>
            <p className="font-mono text-xs text-rose-300/70 break-all leading-relaxed">{error.message}</p>
          </div>
        )}

      </div>

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}