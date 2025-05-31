"use client";

import { usePathname } from "next/navigation";
import { BottomNavigation } from "@/components/bottom-navigation";

export function ConditionalBottomNavigation() {
  const pathname = usePathname();
  
  // Hide bottom navigation on the login page
  if (pathname === "/") {
    return null;
  }
  
  return <BottomNavigation />;
}
