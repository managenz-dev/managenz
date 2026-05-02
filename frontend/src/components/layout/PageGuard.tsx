"use client";
/**
 * PageGuard
 *
 * Wrap every protected page with this. It:
 *  1. Shows a full-screen spinner while hasHydrated is false
 *  2. Once hydrated, checks auth synchronously — no extra network call if
 *     we already know who the user is from a previous page visit
 *  3. Redirects to /auth/login if not authenticated
 *  4. Optionally redirects to /select-domain if requireDomain is true
 *
 * Usage:
 *   <PageGuard requireDomain>
 *     <YourPageContent/>
 *   </PageGuard>
 */
import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

interface Props {
  children: ReactNode;
  requireDomain?: boolean;
}

export default function PageGuard({ children, requireDomain = false }: Props) {
  const router  = useRouter();
  const { fetchMe, hasHydrated } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (hasHydrated) {
      // Already hydrated from previous navigation — check instantly, no spinner
      checkAndGo();
    } else {
      // First load — fetch session then check
      fetchMe().then(() => checkAndGo());
    }
  }, []);

  function checkAndGo() {
    const { isAuthenticated, user } = useAuthStore.getState();

    if (!isAuthenticated || !user) {
      const returnTo = encodeURIComponent(window.location.pathname);
      router.replace(`/auth/login?returnTo=${returnTo}`);
      return;
    }

    if (requireDomain && !user.selectedDomain) {
      router.replace("/select-domain");
      return;
    }

    setReady(true);
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#070711] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#7c6cfc] animate-spin"/>
          <p className="font-mono text-xs text-white/20">Loading…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}