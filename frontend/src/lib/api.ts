// frontend/src/lib/api.ts
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://managenz-backend.onrender.com";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
  withCredentials: true,
});

// Get auth token from localStorage or cookies
function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    // Try localStorage first
    const token = localStorage.getItem("managenz_token");
    if (token) return token;
    
    // Fallback to cookies
    const cookies = document.cookie.split("; ");
    const authCookie = cookies.find(c => c.startsWith("managenz_token="));
    if (authCookie) return authCookie.split("=")[1];
  }
  return null;
}

// Request interceptor: Attach auth token
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  config.headers["Content-Type"] = "application/json";
  return config;
});

// Response interceptor: Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window === "undefined") return Promise.reject(error);

    const status = error.response?.status;
    const url = error.config?.url || "";
    const pathname = window.location.pathname;

    // Don't redirect on auth endpoints
    if (
      url.includes("/auth/signup") || 
      url.includes("/auth/login") || 
      url.includes("/otp/")
    ) {
      return Promise.reject(error);
    }

    const isAuthPage = pathname.startsWith("/auth");

    // 401: Clear tokens and redirect to login
    if (status === 401 && !isAuthPage) {
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