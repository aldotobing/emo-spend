"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircle, Home, BarChart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function BottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: Home, label: "Dashboard", id: "dashboard" },
    { href: "/add", icon: PlusCircle, label: "Add", id: "add", isCenter: true },
    { href: "/insights", icon: BarChart, label: "Insights", id: "insights" },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="sm:hidden fixed inset-x-0 bottom-0 z-[9999] bg-background/95 backdrop-blur-xl border-t border-border/50 shadow-2xl"
    >
      {/* Gradient overlay for extra depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />

      <div className="relative flex justify-center items-center px-6 h-20">
        {/* Navigation items container */}
        <div className="flex justify-between items-center w-full max-w-xs">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            if (item.isCenter) {
              return (
                <Link key={item.id} href={item.href} className="relative">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    {/* Floating add button */}
                    <div className="relative -top-8">
                      <motion.div
                        animate={isActive ? { rotate: 45 } : { rotate: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                        className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-xl flex items-center justify-center border-4 border-background relative overflow-hidden"
                      >
                        {/* Animated background effect */}
                        <motion.div
                          animate={
                            isActive
                              ? { scale: 1.2, opacity: 0.3 }
                              : { scale: 1, opacity: 0 }
                          }
                          transition={{ duration: 0.3 }}
                          className="absolute inset-0 bg-white rounded-full"
                        />
                        <Icon className="h-7 w-7 relative z-10" />
                      </motion.div>

                      {/* Ripple effect */}
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0.5 }}
                          animate={{ scale: 2, opacity: 0 }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="absolute inset-0 -top-8 w-16 h-16 rounded-full border-2 border-primary/30"
                        />
                      )}
                    </div>

                    {/* Label */}
                    <motion.span
                      animate={
                        isActive ? { opacity: 1, y: 0 } : { opacity: 0.7, y: 2 }
                      }
                      className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  </motion.div>
                </Link>
              );
            }

            return (
              <Link key={item.id} href={item.href} className="relative">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-1 p-2 relative"
                >
                  {/* Icon background */}
                  <motion.div
                    animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                    className={`p-2 rounded-xl transition-colors duration-200 ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </motion.div>

                  {/* Label with animated underline */}
                  <div className="relative">
                    <motion.span
                      animate={isActive ? { opacity: 1 } : { opacity: 0.7 }}
                      className="text-xs font-medium"
                    >
                      {item.label}
                    </motion.span>

                    {/* Active indicator */}
                    <motion.div
                      animate={
                        isActive
                          ? { scaleX: 1, opacity: 1 }
                          : { scaleX: 0, opacity: 0 }
                      }
                      transition={{ duration: 0.2 }}
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full origin-center"
                    />
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
