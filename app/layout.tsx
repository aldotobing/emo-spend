import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import Navbar from "@/components/navbar"
import { Toaster } from "@/components/ui/toaster"
import { SyncProvider } from "./providers"
import { AuthProvider } from "@/context/auth-context"
import { AuthGuard } from "@/components/auth-guard"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EmoSpend - Track Your Emotional Spending",
  description: "Track your expenses and understand your emotional spending patterns",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
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
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <SyncProvider>
              <AuthGuard>
                <div className="flex min-h-screen flex-col">
                  <Navbar />
                  <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
                </div>
              </AuthGuard>
              <Toaster />
            </SyncProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
