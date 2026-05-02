// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import "../styles/globals.css";
import { Toaster } from "sonner";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "ManaGenz — Train Like a Real Manager",
  description:
    "Simulation-based managerial decision training. Enter realistic business scenarios, make decisions, experience consequences, and build real managerial judgment.",
  keywords: "management training, MBA, business simulation, decision making, managerial skills",
  openGraph: {
    title: "ManaGenz — Train Like a Real Manager",
    description: "Simulation-based managerial decision training platform.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* ✅ Viewport meta tag for mobile responsiveness */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Existing autofill styles */}
        <style>{`
          /* Light mode autofill */
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0px 1000px #f8f7ff inset !important;
            -webkit-text-fill-color: #1a1535 !important;
            caret-color: #1a1535;
            border-color: rgba(124, 108, 252, 0.3) !important;
            transition: background-color 9999s ease-in-out 0s;
          }
          /* Dark mode autofill */
          .dark input:-webkit-autofill,
          .dark input:-webkit-autofill:hover,
          .dark input:-webkit-autofill:focus,
          .dark input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0px 1000px #0d0d1a inset !important;
            -webkit-text-fill-color: #ffffff !important;
            caret-color: #ffffff;
            border-color: rgba(124, 108, 252, 0.3) !important;
            transition: background-color 9999s ease-in-out 0s;
          }
        `}</style>
      </head>
      <body className="antialiased">
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--toast-bg, #ffffff)",
                border: "1px solid var(--toast-border, #e2e8f0)",
                color: "var(--toast-text, #1a1535)",
                fontFamily: "var(--font-body)",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}