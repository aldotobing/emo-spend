"use client";

import type React from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";

interface AuthGuardProps {
  readonly children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  // Check if the path is an auth page
  const isAuthPage = pathname?.startsWith("/auth");

  // Show nothing while checking authentication
  if (isLoading) {
    return null;
  }

  // If user is not authenticated and not on an auth page, redirect to login
  if (!user && !isAuthPage && pathname !== "/") {
    // The auth context will handle the actual redirection
    return null;
  }

  // If user is authenticated and on an auth page, the auth context will handle the redirect
  // via the onAuthStateChange listener

  return <>{children}</>;
}
