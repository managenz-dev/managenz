// frontend/src/lib/api.ts
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://managenz-backend.onrender.com";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
  withCredentials: true,
});

// ── Helper: Get Auth Token ───────────────────────────────────────────────────
function getAuthToken(): string | null {
  // Check localStorage first (client-side)
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("managenz_token");
    if (token) return token;
  }
  // Fallback: check cookies (server-side or if localStorage not available)
  if (typeof document !== "undefined") {
    const cookies = document.cookie.split("; ");
    const authCookie = cookies.find(c => c.startsWith("managenz_token="));
    if (authCookie) return authCookie.split("=")[1];
  }
  return null;
}

// ── Request Interceptor: Attach Auth Token ───────────────────────────────────
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  config.headers["Content-Type"] = "application/json";
  return config;
});

// ── Response Interceptor: Handle Errors & Redirects ──────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't run on server-side
    if (typeof window === "undefined") return Promise.reject(error);

    const status = error.response?.status;
    const url = error.config?.url || "";
    const pathname = window.location.pathname;

    // ✅ FIX: Ignore 401s/Errors on Signup/Login so toasts don't block the flow
    if (url.includes("/auth/signup") || url.includes("/auth/login") || url.includes("/otp/")) {
      return Promise.reject(error);
    }

    const isAuthPage = pathname.startsWith("/auth");
    const isAdminPage = pathname.startsWith("/admin");
    const isEmpPage = pathname.startsWith("/emp");
    const isEmpApi = url.includes("/emp/") || url.startsWith("emp/");
    const isAdminApi = url.includes("/admin/") || url.startsWith("admin/");

    // Admin/Employee 401: reject (let component handle)
    if (status === 401 && (isAdminApi || isEmpApi) && !isAdminPage && !isEmpPage) {
      return Promise.reject(error);
    }

    // Student 401: clear token and redirect to login
    if (
      status === 401 &&
      !isAuthPage &&
      !isAdminPage &&
      !isEmpPage &&
      !isEmpApi &&
      !isAdminApi
    ) {
      // Clear tokens
      if (typeof window !== "undefined") {
        localStorage.removeItem("managenz_token");
        localStorage.removeItem("managenz_user");
        document.cookie = "managenz_token=; path=/; max-age=0";
      }
      const returnTo = encodeURIComponent(pathname);
      window.location.href = `/auth/login?returnTo=${returnTo}`;
    }

    return Promise.reject(error);
  }
);

export default api;