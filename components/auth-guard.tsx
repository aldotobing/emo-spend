"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  readonly children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Skip if still loading auth state
    if (isLoading) return;

    // Check if the path is an auth page
    const isAuthPage = pathname?.startsWith("/auth");

    // If user is not authenticated and not on an auth page or home page, redirect to login
    if (!user && !isAuthPage && pathname !== "/") {
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // If user is authenticated and on an auth page, redirect to dashboard
    if (user && isAuthPage) {
      router.push("/");
      return;
    }

    // If we get here, the route is allowed
    setIsCheckingAuth(false);
  }, [user, isLoading, pathname, router]);

  // Show loading state while checking authentication or redirecting
  if (isLoading || isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
