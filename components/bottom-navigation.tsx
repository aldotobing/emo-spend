"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircle, Home, BarChart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useBottomNav } from "@/context/bottom-nav-context";

function BottomNavigationContent() {
  const pathname = usePathname();
  const { setIsVisible, isVisible } = useBottomNav();
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const navItems = [
    { href: "/", icon: Home, label: "", id: "dashboard" },
    ...(pathname.startsWith("/dashboard") ? 
      [{ href: "/add", icon: PlusCircle, label: "", id: "add", isCenter: true }] : []),
    { href: "/insights", icon: BarChart, label: "", id: "insights" },
  ];
  
  // Handle scroll to show/hide bottom nav
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    
    // Always show when at the top of the page
    if (currentScrollY <= 10) {
      setIsVisible(true);
    }
    // Hide when scrolling down, show when scrolling up
    else if (currentScrollY > lastScrollY && currentScrollY > 100) {
      setIsVisible(false);
    } else if (currentScrollY < lastScrollY) {
      setIsVisible(true);
    }
    
    setLastScrollY(currentScrollY);
  }, [lastScrollY, setIsVisible]);
  
  // Set up scroll listener
  useEffect(() => {
    // Throttle scroll events for better performance
    let timeoutId: NodeJS.Timeout;
    const throttledHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 10);
    };

    window.addEventListener("scroll", throttledHandleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", throttledHandleScroll);
      clearTimeout(timeoutId);
    };
  }, [handleScroll]);
  
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.nav
          initial={{ y: 100, opacity: 0 }}
          animate={{ 
            y: 0, 
            opacity: 1,
            transition: {
              type: "spring",
              stiffness: 300,
              damping: 30,
              opacity: { duration: 0.2 }
            }
          }}
          exit={{ 
            y: 100, 
            opacity: 0,
            transition: {
              type: "spring",
              stiffness: 400,
              damping: 35,
              opacity: { duration: 0.15 }
            }
          }}
          className="sm:hidden fixed inset-x-0 bottom-0 z-[9999] bg-background/90 backdrop-blur-3xl border-t border-border/20 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]"
        >
          {/* Frosted glass effect */}
          <div className="absolute inset-0 bg-background/70 backdrop-blur-3xl pointer-events-none" />
          
          {/* Subtle top highlight */}
          <div className="absolute -top-px inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
          
          {/* Top inner shadow */}
          <div className="absolute inset-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] rounded-t-3xl pointer-events-none" />

          <div className="relative flex justify-center items-center px-8 h-16">
            {/* Navigation items container with improved spacing */}
            <div className="flex justify-between items-center w-full max-w-xs px-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                if (item.isCenter) {
                  return (
                    <motion.div
                      key={item.id}
                      className="relative -mt-8 flex-shrink-0"
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <Link
                        href={item.href}
                        className={`flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors ${
                          isActive ? "ring-2 ring-offset-2 ring-ring" : ""
                        }`}
                        aria-label={item.id}
                      >
                        <Icon className="w-6 h-6" aria-hidden="true" />
                      </Link>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={item.id}
                    className="relative flex-1 flex justify-center"
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Link
                      href={item.href}
                      className={`flex flex-col items-center justify-center w-full py-2 text-sm font-medium transition-colors ${
                        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                      aria-label={item.id}
                    >
                      <Icon className="w-6 h-6 mb-1" aria-hidden="true" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

export function BottomNavigation() {
  const pathname = usePathname();
  
  // Hide on home and auth pages
  if (pathname === '/' || pathname === '/auth/login' || pathname === '/auth/register') {
    return null;
  }

  return <BottomNavigationContent />;
}

export default BottomNavigation;