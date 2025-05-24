"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircle, Home, BarChart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export function BottomNavigation() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const navItems = [
    { href: "/", icon: Home, label: "", id: "dashboard" },
    { href: "/add", icon: PlusCircle, label: "", id: "add", isCenter: true },
    { href: "/insights", icon: BarChart, label: "", id: "insights" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show navigation when at the top of the page
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
    };

    // Use requestAnimationFrame for better performance
    let rafId: number;
    const throttledHandleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        handleScroll();
        rafId = 0;
      });
    };

    window.addEventListener("scroll", throttledHandleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", throttledHandleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [lastScrollY]);

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
          className="sm:hidden fixed inset-x-0 bottom-0 z-[9999] bg-background/95 backdrop-blur-xl border-t border-border/30 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] pb-safe"
        >
          {/* Enhanced frosted glass effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-background/60 backdrop-blur-xl pointer-events-none" />
          
          {/* Subtle top highlight */}
          <div className="absolute -top-px inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          
          {/* Top inner shadow for depth */}
          <div className="absolute inset-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] rounded-t-3xl pointer-events-none" />

          <div className="relative flex justify-center items-center px-6 py-2 h-20">
            {/* Navigation items container with better spacing */}
            <div className="flex justify-between items-center w-full max-w-sm px-4">
              {navItems.map((item, index) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                if (item.isCenter) {
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ 
                        scale: 1, 
                        opacity: 1,
                        transition: { delay: index * 0.1 }
                      }}
                      className="relative"
                    >
                      <Link href={pathname === '/add' ? '/' : '/add'} className="relative touch-manipulation">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="relative"
                        >
                          {/* Enhanced floating add button */}
                          <div className="relative -top-6">
                            <motion.div
                              animate={isActive ? { 
                                rotate: 45, 
                                scale: 1.1,
                                boxShadow: '0 12px 35px -5px var(--tw-shadow-color), 0 0 20px -5px var(--tw-shadow-color)' 
                              } : { 
                                rotate: 0, 
                                scale: 1,
                                boxShadow: '0 6px 20px -3px var(--tw-shadow-color)' 
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 25,
                              }}
                              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground flex items-center justify-center border-2 border-white/20 relative overflow-hidden backdrop-blur-sm shadow-lg shadow-primary/40"
                            >
                              {/* Enhanced animated background effect */}
                              <motion.div
                                animate={
                                  isActive
                                    ? { scale: 1.2, opacity: 0.5 }
                                    : { scale: 1, opacity: 0 }
                                }
                                transition={{ duration: 0.3 }}
                                className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/10 rounded-2xl"
                              />
                              
                              {/* Subtle inner glow */}
                              <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-white/25 to-transparent" />
                              
                              <Icon className="h-8 w-8 relative z-10 drop-shadow-sm" />
                            </motion.div>

                            {/* Enhanced ripple effect */}
                            <AnimatePresence>
                              {isActive && (
                                <>
                                  <motion.div
                                    initial={{ scale: 0.8, opacity: 0.6 }}
                                    animate={{ scale: 2.2, opacity: 0 }}
                                    exit={{ scale: 2.5, opacity: 0 }}
                                    transition={{ 
                                      duration: 1.5, 
                                      repeat: Infinity,
                                      ease: "easeOut"
                                    }}
                                    className="absolute inset-0 -top-6 w-16 h-16 rounded-2xl border-2 border-primary/30"
                                  />
                                  <motion.div
                                    initial={{ scale: 0.8, opacity: 0.4 }}
                                    animate={{ scale: 1.8, opacity: 0 }}
                                    exit={{ scale: 2, opacity: 0 }}
                                    transition={{ 
                                      duration: 1.2, 
                                      repeat: Infinity,
                                      delay: 0.3,
                                      ease: "easeOut"
                                    }}
                                    className="absolute inset-0 -top-6 w-16 h-16 rounded-2xl border border-primary/40"
                                  />
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      </Link>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={item.id}
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1, 
                      y: 0,
                      transition: { delay: index * 0.1 }
                    }}
                  >
                    <Link href={item.href} className="relative touch-manipulation">
                      <motion.div
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex flex-col items-center gap-1 py-3 px-4 relative min-h-[60px]"
                      >
                        {/* Enhanced icon background */}
                        <motion.div
                          animate={isActive ? { 
                            scale: 1.15,
                            y: -3,
                            backgroundColor: 'rgba(var(--primary), 0.12)',
                            boxShadow: '0 4px 20px -3px rgba(var(--primary), 0.25)'
                          } : { 
                            scale: 1,
                            y: 0,
                            backgroundColor: 'transparent',
                            boxShadow: 'none'
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          }}
                          className={`p-3 rounded-2xl transition-all duration-300 relative overflow-hidden ${
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {/* Active state glow */}
                          {isActive && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute inset-0 bg-primary/8 rounded-2xl blur-sm"
                            />
                          )}
                          
                          <Icon className="h-7 w-7 relative z-10" />
                        </motion.div>

                        {/* Enhanced active indicator */}
                        <motion.div
                          animate={
                            isActive
                              ? { scaleX: 1, opacity: 1 }
                              : { scaleX: 0, opacity: 0 }
                          }
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-full origin-center"
                        />
                        
                        {/* Subtle dot indicator */}
                        <motion.div
                          animate={
                            isActive
                              ? { scale: 1, opacity: 1 }
                              : { scale: 0, opacity: 0 }
                          }
                          transition={{ duration: 0.2, delay: 0.1 }}
                          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full"
                        />
                      </motion.div>
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