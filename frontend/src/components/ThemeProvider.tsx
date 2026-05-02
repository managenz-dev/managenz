"use client";
// Light-only ThemeProvider — dark mode removed entirely.
// Always ensures the `dark` class is absent from <html>.
import { useEffect } from "react";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
  return <>{children}</>;
}