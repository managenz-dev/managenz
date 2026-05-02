"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  LogOut, User, Settings, ChevronDown,
  BookOpen, LayoutDashboard, Globe,
  Trophy, BarChart3, Award,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";

const G = "#5a7f2e";

const navLinks = [
  { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { href: "/domains",     label: "Simulations", icon: BookOpen        },
  { href: "/badges",      label: "Badges",      icon: Award           },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy          },
  { href: "/analytics",   label: "Analytics",   icon: BarChart3       },
];

export default function AppNavbar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, fetchMe, logout } = useAuthStore();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchMe(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    logout();
    router.push("/");
  };

  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <>
    <style>{`@keyframes dropIn{from{opacity:0;transform:translateY(-6px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
      <div className="w-full px-5 xl:px-10 2xl:px-16 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href={isAuthenticated && user ? "/dashboard" : "/"} className="flex-shrink-0 flex items-center h-8 w-36 relative">
          <Image src="/logo.png" alt="ManaGenz" fill className="object-contain object-left" priority
            onError={(e) => {
              const t = e.target as HTMLImageElement;
              t.style.display = "none";
              const s = document.createElement("span");
              s.textContent = "ManaGenz";
              s.style.cssText = `font-size:18px;font-weight:800;color:${G}`;
              t.parentElement?.appendChild(s);
            }}
          />
        </Link>

        {/* Desktop nav links */}
        {isAuthenticated && user && (
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-body text-sm font-medium transition-all ${
                    active
                      ? "text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  style={active ? { background: G } : {}}>
                  <Icon className="w-4 h-4"/>
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setDropOpen(o => !o)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-all"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                  style={{ background: G }}>
                  {initials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="font-body text-sm text-slate-800 font-semibold leading-none truncate max-w-[120px]">
                    {user.name?.split(" ")[0] || "Account"}
                  </p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${dropOpen ? "rotate-180" : ""}`}/>
              </button>

              {dropOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50"
                  style={{ animation: "dropIn 0.15s ease" }}
                >
                  {/* User info */}
                  <div className="px-4 py-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: G }}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-body text-sm text-slate-900 font-semibold truncate">{user.name || "User"}</p>
                        <p className="font-mono text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="p-1.5">
                    {[
                      { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
                      { href: "/domains",     label: "Simulations", icon: BookOpen        },
                      { href: "/badges",      label: "Badges",      icon: Award           },
                      { href: "/leaderboard", label: "Leaderboard", icon: Trophy          },
                      { href: "/analytics",   label: "Analytics",   icon: BarChart3       },
                      { href: "/profile",     label: "Profile",     icon: User            },
                      { href: "/settings",    label: "Settings",    icon: Settings        },
                    ].map(({ href, label, icon: Icon }) => (
                      <Link key={href} href={href} onClick={() => setDropOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all font-body text-sm font-medium">
                        <Icon className="w-4 h-4 text-slate-400"/>
                        {label}
                      </Link>
                    ))}
                  </div>

                  <div className="p-1.5 border-t border-slate-100">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-all font-body text-sm font-medium">
                      <LogOut className="w-4 h-4"/>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login" className="font-body text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 transition-colors font-medium">
                Log in
              </Link>
              <Link href="/auth/signup"
                className="font-body text-sm font-semibold text-white px-4 py-2 rounded-xl transition-all shadow-sm"
                style={{ background: G }}>
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
    </>
  );
}