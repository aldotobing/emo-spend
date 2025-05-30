"use client";

import type React from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  readonly children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Check if the path is an auth page or the home page
  const isAuthPage = pathname?.startsWith("/auth");
  const isHomePage = pathname === "/";

  useEffect(() => {
    if (!isLoading && !user && !isAuthPage && !isHomePage) {
      // Store the current path to redirect back after login
      const redirectPath = encodeURIComponent(pathname || "/");
      router.push(`/auth/login?redirect=${redirectPath}`);
    }
  }, [isLoading, user, isAuthPage, isHomePage, pathname, router]);

  // Show loading indicator while checking authentication
  if (isLoading || (!user && !isAuthPage && !isHomePage)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
