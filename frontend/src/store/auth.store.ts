// frontend/src/store/auth.store.ts
import { create } from "zustand";
import Cookies from "js-cookie";
import api from "@/lib/api";

interface DomainRef {
  id: string;
  slug: string;
  name: string;
  colorHex?: string;
}

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  plan: string;
  userType?: string | null;
  selectedDomainId?: string | null;
  selectedDomain?: DomainRef | null;
  gender?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  collegeName?: string | null;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasHydrated: boolean;

  login: (identifier: string, password: string) => Promise<void>;
  register: (data: { firstName: string; lastName: string; phone: string; email: string; password: string; gender: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: User) => void;
  checkOnboardingStep: () => string;
}

const TOKEN_KEY = "managenz_token";

const getToken = () => {
  try {
    return Cookies.get(TOKEN_KEY) || null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: getToken(),
  isLoading: false,
  isAuthenticated: !!getToken(),
  hasHydrated: false,

  login: async (identifier, password) => {
    set({ isLoading: true });
    try {
      await api.post("/auth/login", { identifier, password });
      await new Promise(resolve => setTimeout(resolve, 50));
      const token = getToken();
      const res = await api.get("/auth/me");
      const user = res.data.data?.user ?? res.data.data;
      set({ user, token, isAuthenticated: true, isLoading: false, hasHydrated: true });
    } catch (err) {
      set({ isLoading: false, isAuthenticated: false });
      throw err;
    }
  },

  // In frontend/src/store/auth.store.ts

// In frontend/src/store/auth.store.ts

register: async (data) => {
  set({ isLoading: true });
  try {
    // ✅ Just create the account - don't fetch user data
    // User needs to verify OTP first before they're authenticated
    await api.post("/auth/signup", { ...data, phone: data.phone.replace(/\s/g, "") });
    
    // ✅ Don't call /auth/me - just return success
    // The page will handle redirect to OTP verification
    set({ isLoading: false });
  } catch (err) {
    set({ isLoading: false });
    throw err; // Let the page handle the error
  }
},

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout API failed:", err);
    }
    Cookies.remove(TOKEN_KEY, { path: "/" });
    set({ user: null, token: null, isAuthenticated: false, hasHydrated: true });
    window.location.href = "/";
  },

  fetchMe: async () => {
    const token = getToken();
    if (!token) {
      set({ isAuthenticated: false, user: null, hasHydrated: true });
      return;
    }
    try {
      const res = await api.get("/auth/me");
      const user = res.data.data?.user ?? res.data.data;
      set({ user, token, isAuthenticated: true, hasHydrated: true });
    } catch (err: any) {
      console.warn("⚠️ fetchMe failed:", err?.response?.status, err?.message);
      if (err?.response?.status === 401) {
        Cookies.remove(TOKEN_KEY, { path: "/" });
        set({ user: null, token: null, isAuthenticated: false, hasHydrated: true });
      } else {
        set({ hasHydrated: true });
      }
    }
  },

  checkOnboardingStep: () => {
    const { user } = get();
    if (!user) return "login";
    if (!user.isEmailVerified && !user.isPhoneVerified) return "verify-otp";
    if (!user.userType) return "user-type";
    if (!user.selectedDomainId) return "domains";
    return "dashboard";
  },

  setUser: (user) => set({ user }),
}));