"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, PlusCircle, FileText,
  LogOut, Shield, ChevronRight, Menu, X,
  Loader2, AlertCircle,
} from "lucide-react";
import api from "@/lib/api";

const G = "#5a7f2e";

interface EmpUser { id:string; name:string; email:string; role:string; }

const EMP_NAV = [
  { href: "/emp",             label: "Dashboard",   icon: LayoutDashboard, exact: true },
  { href: "/emp/simulations", label: "Simulations", icon: FileText },
  { href: "/emp/new",         label: "New Simulation", icon: PlusCircle },
];

const ADMIN_NAV = [
  { href: "/emp",                  label: "Dashboard",    icon: LayoutDashboard, exact: true },
  { href: "/emp/simulations",      label: "Simulations",  icon: FileText },
  { href: "/emp/new",              label: "New Simulation",icon: PlusCircle },
];

function Sidebar({ emp, onClose }: { emp: EmpUser | null; onClose?: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();
  const isAdmin  = emp?.role === "ADMIN";

  const handleLogout = async () => {
    try { await api.post("/emp/logout"); } catch {}
    router.push("/emp/login");
  };

  const navItems = isAdmin ? ADMIN_NAV : EMP_NAV;

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200 flex-shrink-0">
        <Link href="/emp" onClick={onClose} className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${G}18`, border: `1.5px solid ${G}35` }}>
            <Shield className="w-3.5 h-3.5" style={{ color: G }}/>
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-none">ManaGenz</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5 font-mono">
              {isAdmin ? "Admin" : "Content Studio"}
            </p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4"/>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href + "/") || pathname === href;
          return (
            <Link key={href} href={href} onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
              style={active ? { background: G } : {}}>
              <Icon className="w-4 h-4 flex-shrink-0"/>
              <span>{label}</span>
              {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60"/>}
            </Link>
          );
        })}

        {/* Admin-only links */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Admin</p>
            </div>
            {[
              { href: "/emp/employees", label: "Employees" },
              { href: "/emp/users",     label: "Users" },
              { href: "/emp/domains",   label: "Domains" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname.startsWith(href)
                    ? "text-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
                style={pathname.startsWith(href) ? { background: G } : {}}>
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100">
        {emp && (
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: G }}>
              {emp.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{emp.name}</p>
              <p className="text-[10px] text-slate-400 font-mono">{emp.role === "ADMIN" ? "Admin" : "Content Dev"}</p>
            </div>
          </div>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-rose-600 hover:bg-rose-50 transition-all font-medium">
          <LogOut className="w-4 h-4"/>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function EmpLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const [emp, setEmp]         = useState<EmpUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    api.get("/emp/me")
      .then(r => setEmp(r.data.data))
      .catch(() => router.replace("/emp/login"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: G }}/>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-60 xl:w-64 flex-shrink-0 flex-col">
        <Sidebar emp={emp}/>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)}/>
          <div className="relative w-64 flex-shrink-0">
            <Sidebar emp={emp} onClose={() => setMobileOpen(false)}/>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 bg-white border-b border-slate-200 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-slate-600">
            <Menu className="w-5 h-5"/>
          </button>
          <p className="font-bold text-slate-900 text-sm">ManaGenz Studio</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}