"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks";
import { LoginHero } from "@/components/auth/login-hero";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import the Dashboard component to avoid loading it on the client side when not needed
const Dashboard = dynamic(() => import("@/app/dashboard/page"), { ssr: false });


export default function HomePage() {
  const { user, isLoading: isUserLoading } = useUser();
  const router = useRouter();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  // Show loading spinner while checking authentication
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Show login hero for unauthenticated users
  if (!user) {
    return <LoginHero />;
  }

  // Show dashboard for authenticated users
  return <Dashboard />;

  // This return is handled by the conditional rendering above
}