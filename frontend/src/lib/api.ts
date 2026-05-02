// frontend/src/lib/api.ts
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
  withCredentials: true, // ✅ Critical: sends cookies with every request
});

// ── Request Interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
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
    // This lets the Signup/Login pages handle their own errors gracefully.
    if (url.includes("/auth/signup") || url.includes("/auth/login")) {
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

    // Student 401: clear cookie and redirect to login
    if (
      status === 401 &&
      !isAuthPage &&
      !isAdminPage &&
      !isEmpPage &&
      !isEmpApi &&
      !isAdminApi
    ) {
      Cookies.remove("managenz_token", { path: "/" });
      const returnTo = encodeURIComponent(pathname);
      window.location.href = `/auth/login?returnTo=${returnTo}`;
    }

    return Promise.reject(error);
  }
);

export default api;