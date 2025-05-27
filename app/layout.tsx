import type React from "react";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/navbar";
import { Toaster } from "@/components/ui/toaster";
import { SyncProvider } from "./providers";
import { SyncStatusProvider } from "@/context/sync-context";
import { AuthProvider } from "@/context/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { ConditionalBottomNavigation } from "@/components/conditional-bottom-navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SyncManager } from "@/components/sync-manager";
import { PWAProvider } from "@/context/pwa-context";
import { PWAInstallButton } from "@/components/pwa-install-button";
import { PWAUpdateNotification } from "@/components/pwa-update-notification";
import { ErrorBoundary } from "@/components/error-boundary";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default:
      "EmoSpend - Track your spending and uncover the emotions behind every purchase with AI-powered insights.",
    template: "%s | EmoSpend - Emotional Spending Tracker",
  },
  description:
    "Track your spending and uncover the emotions behind every purchase with AI-powered insights. Understand your money habits, improve financial wellness, and make smarter spending decisions. Free expense tracker with emotional intelligence.",
  generator: "Next.js",
  applicationName: "EmoSpend",
  keywords: [
    "emotional spending tracker",
    "expense tracker app",
    "money habits tracker",
    "financial wellness",
    "AI spending insights",
    "emotional finance",
    "spending psychology",
    "mindful spending",
    "financial self-awareness",
    "money mindset",
    "expense management",
    "financial behavior",
    "spending patterns",
    "budget tracker",
    "financial therapy",
    "money emotions",
    "impulse spending",
    "financial health",
    "spending diary",
    "personal finance tracker",
    "EmoSpend",
    "smart expense tracker",
    "financial mindfulness",
    "spending analytics",
  ],
  authors: [{ name: "Aldo Tobing", url: "https://spend.aldotobing.online" }],
  creator: "Aldo Tobing",
  publisher: "Aldo Tobing",
  referrer: "origin-when-cross-origin",
  category: "Finance",
  classification: "Personal Finance Application",
  metadataBase: new URL("https://spend.aldotobing.online"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    title: "EmoSpend - Track Your Emotional Spending & Money Habits with AI",
    description:
      "Track your spending and uncover the emotions behind every purchase with AI-powered insights. Understand your money habits, improve financial wellness, and make smarter spending decisions.",
    url: "https://spend.aldotobing.online",
    siteName: "EmoSpend",
    images: [
      {
        url: "https://spend.aldotobing.online/logo.png",
        width: 1200,
        height: 630,
        alt: "EmoSpend - Emotional Spending Tracker App with AI Insights",
        type: "image/png",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "EmoSpend - Track Your Emotional Spending & Money Habits with AI",
    description:
      "Track your expenses and understand your emotional spending patterns with AI-powered insights. Improve your financial wellness and make smarter money decisions.",
    creator: "@aldo_tobing",
    site: "@aldo_tobing",
    images: [
      {
        url: "https://spend.aldotobing.online/logo.png",
        width: 1200,
        height: 630,
        alt: "EmoSpend - Emotional Spending Tracker App",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EmoSpend",
    startupImage: [
      {
        url: "/icons/apple-touch-icon.jpg",
        media:
          "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/icons/apple-touch-icon.jpg",
        media:
          "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
    ],
  },
  manifest: "/api/site.webmanifest",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "EmoSpend",
    "application-name": "EmoSpend",
    "msapplication-config": "/browserconfig.xml"
  },
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  // SyncManager component handles all client-side sync logic
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EmoSpend" />
        <link rel="apple-touch-icon" href="/icons/favicon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="EmoSpend" />
        <meta name="msapplication-TileColor" content="#6366f1" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        {/* Icons and PWA */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.jpg" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Enhanced JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "EmoSpend",
              alternateName: "Emotional Spending Tracker",
              url: "https://spend.aldotobing.online",
              description:
                "Track your spending and uncover the emotions behind every purchase with AI-powered insights. Understand your money habits, improve financial wellness, and make smarter spending decisions.",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web Browser",
              browserRequirements: "Requires JavaScript. Requires HTML5.",
              softwareVersion: "1.0",
              datePublished: "2024-01-01",
              dateModified: new Date().toISOString().split("T")[0],
              inLanguage: "en",
              isAccessibleForFree: true,
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
              },
              featureList: [
                "Emotional spending tracking",
                "AI-powered spending insights",
                "Expense categorization",
                "Financial behavior analysis",
                "Spending pattern recognition",
                "Budget management",
                "Financial wellness tracking",
              ],
              screenshot: "https://spend.aldotobing.online/logo.png",
              author: {
                "@type": "Person",
                name: "Aldo Tobing",
                url: "https://aldotobing.online",
              },
              publisher: {
                "@type": "Person",
                name: "Aldo Tobing",
              },
              maintainer: {
                "@type": "Person",
                name: "Aldo Tobing",
              },
            }),
          }}
        />

        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "EmoSpend",
              url: "https://spend.aldotobing.online",
              logo: "https://spend.aldotobing.online/logo.png",
              description: "Emotional spending tracker app with AI insights",
              founder: {
                "@type": "Person",
                name: "Aldo Tobing",
              },
              sameAs: ["https://twitter.com/aldo_tobing"],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                url: "https://spend.aldotobing.online/contact",
              },
            }),
          }}
        />

        {/* Software Application Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "EmoSpend",
              operatingSystem: "Web",
              applicationCategory: "FinanceApplication",
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.8",
                ratingCount: "127",
              },
              offers: {
                "@type": "Offer",
                price: "0.00",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <SyncManager />
          <PWAProvider>
            <AuthProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <SyncStatusProvider>
                  <SyncProvider>
                    <AuthGuard>
                      <div className="flex min-h-screen flex-col">
                        <Navbar />
                        <main
                          className="flex-1 container mx-auto px-4 py-6"
                          role="main"
                        >
                          {children}
                          <Analytics />
                          <SpeedInsights />
                        </main>
                        <ConditionalBottomNavigation />
                      </div>
                      <Toaster />
                      <PWAInstallButton />
                      <PWAUpdateNotification />
                    </AuthGuard>
                  </SyncProvider>
                </SyncStatusProvider>
              </ThemeProvider>
            </AuthProvider>
          </PWAProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
