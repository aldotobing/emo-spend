"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Skip during initial load
    if (isLoading) return

    // Check if the path is an auth page
    const isAuthPage = pathname?.startsWith("/auth")

    // If user is not authenticated and not on an auth page, redirect to login
    if (!user && !isAuthPage && pathname !== "/") {
      router.push(`/auth/login?next=${encodeURIComponent(pathname || "/")}`)
    }

    // If user is authenticated and on an auth page, redirect to dashboard
    if (user && isAuthPage) {
      router.push("/")
    }
  }, [user, isLoading, pathname, router])

  // Show nothing while checking authentication
  if (isLoading) {
    return null
  }

  return <>{children}</>
}
