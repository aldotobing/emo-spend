import type React from "react";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/navbar";
import { Toaster } from "@/components/ui/toaster";
import { SyncProvider } from "./providers";
import { AuthProvider } from "@/context/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { BottomNavigation } from "@/components/bottom-navigation";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "EmoSpend - Track Your Emotional Spending",
  description:
    "Track your spending and uncover the emotions behind every purchase — with smart AI insights to help you understand, reflect, and grow.",
  generator: "v0.dev",
  applicationName: "EmoSpend",
  keywords: [
    "EmoSpend",
    "emotional spending",
    "expense tracker",
    "money habits",
    "finance tracker",
  ],
  authors: [{ name: "Aldo Tobing", url: "https://spend.aldotobing.online" }],
  creator: "Aldo Tobing",
  publisher: "Aldo Tobing",
  metadataBase: new URL("https://spend.aldotobing.online"),
  openGraph: {
    title: "EmoSpend - Track Your Emotional Spending",
    description:
      "Track your spending and uncover the emotions behind every purchase — with smart AI insights to help you understand, reflect, and grow.",
    url: "https://spend.aldotobing.online",
    siteName: "EmoSpend",
    images: [
      {
        url: "https://spend.aldotobing.online/logo.png",
        width: 1200,
        height: 630,
        alt: "EmoSpend App Preview",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EmoSpend - Track Your Emotional Spending",
    description: "Track your expenses and understand your emotional spending patterns — with smart AI insights to help you understand, reflect, and grow.",
    creator: "@aldo_tobing", 
    images: ["https://spend.aldotobing.online/logo.png"],
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
        <meta name="application-name" content="EmoSpend" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EmoSpend" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#6366f1" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="canonical" href="https://aldotobing.online" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="EmoSpend" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "EmoSpend",
              url: "https://spend.aldotobing.online",
              description:
                "Track your expenses and understand your emotional spending patterns.",
              applicationCategory: "FinanceApplication",
              operatingSystem: "All",
            }),
          }}
        ></script>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="ligth"
            enableSystem
            disableTransitionOnChange
          >
            <SyncProvider>
              <AuthGuard>
                <div className="flex min-h-screen flex-col">
                  <Navbar />
                  <main className="flex-1 container mx-auto px-4 py-6">
                    {children}
                  </main>
                  <BottomNavigation />
                </div>
              </AuthGuard>
              <Toaster />
            </SyncProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
