"use client";

import { usePathname } from "next/navigation";
import { BottomNavigation } from "@/components/bottom-navigation";

export function ConditionalBottomNavigation() {
  const pathname = usePathname();
  
  // Don't show bottom navigation on the add expense page
  if (pathname === "/add") {
    return null;
  }
  
  return <BottomNavigation />;
}
