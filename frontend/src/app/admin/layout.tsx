"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Globe, Users, BarChart2,
  LogOut, Menu, X, ChevronRight, Shield, Loader2, UserCheck, FileText,
} from "lucide-react";
import api from "@/lib/api";

/* IMPORTANT: No CSS import here. All styles come from Tailwind classes.
   The globals.css is imported only from the root src/app/layout.tsx */

const G = "#5a7f2e";

const NAV = [
  { href: "/admin",             label: "Dashboard",  icon: LayoutDashboard, exact: true },
  { href: "/admin/analytics",   label: "Analytics",  icon: BarChart2 },
  { href: "/admin/simulations", label: "Simulations",icon: FileText },
  { href: "/admin/domains",     label: "Domains",    icon: Globe },
  { href: "/admin/users",       label: "Users",      icon: Users },
  { href: "/admin/employees",   label: "Team",       icon: UserCheck },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = async () => {
    try { await api.post("/admin/logout"); } catch {}
    router.push("/admin/login");
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200 flex-shrink-0">
        <Link href="/admin" onClick={onClose} className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${G}18`, border: `1.5px solid ${G}35` }}
          >
            <Shield className="w-3.5 h-3.5" style={{ color: G }}/>
          </div>
          <div>
            <p className="font-display font-bold text-slate-900 text-sm leading-none">ManaGenz</p>
            <p className="font-mono text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Admin</p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-4 h-4"/>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium
                ${active ? "text-white" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}
              style={active ? { background: G } : {}}
            >
              <Icon className="w-4 h-4 flex-shrink-0"/>
              <span>{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50"/>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-200 flex-shrink-0 space-y-0.5">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all text-sm font-medium"
        >
          <Globe className="w-4 h-4"/>
          <span>View Site</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-all text-sm font-medium"
        >
          <LogOut className="w-4 h-4"/>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router     = useRouter();
  const pathname   = usePathname();
  const [checking,   setChecking]   = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") { setChecking(false); return; }
    api.get("/admin/verify")
      .then(() => setChecking(false))
      .catch(() => router.replace("/admin/login"));
  }, [pathname]);

  if (pathname === "/admin/login") return <>{children}</>;

  if (checking) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: G }}/>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-56 flex-shrink-0 fixed inset-y-0 left-0 z-40 shadow-sm">
        <div className="w-full"><Sidebar/></div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" onClick={() => setMobileOpen(false)}/>
          <div className="relative w-56 flex-shrink-0 z-10 shadow-xl">
            <Sidebar onClose={() => setMobileOpen(false)}/>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:pl-56 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 h-14 px-4 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600"
          >
            <Menu className="w-4 h-4"/>
          </button>
          <p className="font-display font-semibold text-sm text-slate-900">ManaGenz Admin</p>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}