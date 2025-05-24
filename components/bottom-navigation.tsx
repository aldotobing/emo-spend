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
                      <Link href={pathname === '/add' ? '/' : '/add'} className="relative">
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
                                boxShadow: '0 10px 30px -5px var(--tw-shadow-color), 0 0 15px -5px var(--tw-shadow-color)' 
                              } : { 
                                rotate: 0, 
                                scale: 1,
                                boxShadow: '0 4px 15px -3px var(--tw-shadow-color)' 
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 25,
                              }}
                              className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground flex items-center justify-center border-2 border-white/20 relative overflow-hidden backdrop-blur-sm shadow-lg shadow-primary/30"
                            >
                              {/* Enhanced animated background effect */}
                              <motion.div
                                animate={
                                  isActive
                                    ? { scale: 1.2, opacity: 0.4 }
                                    : { scale: 1, opacity: 0 }
                                }
                                transition={{ duration: 0.3 }}
                                className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/10 rounded-full"
                              />
                              
                              {/* Subtle inner glow */}
                              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
                              
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
                                    className="absolute inset-0 -top-6 w-16 h-16 rounded-full border-2 border-primary/20"
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
                                    className="absolute inset-0 -top-6 w-16 h-16 rounded-full border border-primary/30"
                                  />
                                </>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Enhanced label with backdrop */}
                          <motion.div
                            animate={
                              isActive 
                                ? { opacity: 1, y: 0, scale: 1 } 
                                : { opacity: 0.8, y: 2, scale: 0.95 }
                            }
                            className="absolute -bottom-4 left-1/2 -translate-x-1/2"
                          >

                          </motion.div>
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
                    <Link href={item.href} className="relative">
                      <motion.div
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex flex-col items-center gap-0.5 py-1.5 px-2 relative"
                      >
                        {/* Enhanced icon background */}
                        <motion.div
                          animate={isActive ? { 
                            scale: 1.1,
                            y: -2,
                            backgroundColor: 'rgba(var(--primary)/0.1)',
                            boxShadow: '0 4px 15px -3px rgba(var(--primary)/0.2)'
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
                          className={`p-3 rounded-xl transition-all duration-300 relative overflow-hidden ${
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {/* Active state glow */}
                          {isActive && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute inset-0 bg-primary/5 rounded-2xl"
                            />
                          )}
                          
                          <Icon className="h-7 w-7 relative z-10" />
                        </motion.div>

                        {/* Enhanced label with animated underline */}
                        <div className="relative">
                          <motion.span
                            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.7, y: 1 }}
                            className="text-xs font-medium transition-all duration-200"
                          >
                            {item.label}
                          </motion.span>

                          {/* Enhanced active indicator */}
                          <motion.div
                            animate={
                              isActive
                                ? { scaleX: 1, opacity: 1 }
                                : { scaleX: 0, opacity: 0 }
                            }
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full origin-center"
                          />
                          
                          {/* Subtle dot indicator */}
                          <motion.div
                            animate={
                              isActive
                                ? { scale: 1, opacity: 1 }
                                : { scale: 0, opacity: 0 }
                            }
                            transition={{ duration: 0.2, delay: 0.1 }}
                            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                          />
                        </div>
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