"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, PieChart, TrendingUp, Settings, LogOut, LogIn, Menu, X, FileText } from "lucide-react"
import { SyncIndicator } from "./sync-indicator"
import { ModeToggle } from "./mode-toggle"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"

export default function Navbar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/income", label: "Income", icon: TrendingUp },
    { href: "/insights", label: "Insights", icon: PieChart },
    { href: "/reports", label: "Reports", icon: FileText },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  // Don't show the main nav items on auth pages
  const isAuthPage = pathname?.startsWith("/auth")

  // Get user avatar URL from metadata
  const avatarUrl = user?.user_metadata?.avatar_url || null
  const displayName = user?.user_metadata?.full_name || user?.email || "User"
  const userInitial = displayName.charAt(0).toUpperCase()

  if (isAuthPage) {
    return (
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b backdrop-blur transition-all duration-200",
          scrolled ? "bg-background/95 border-primary/10" : "bg-transparent border-transparent",
        )}
      >
        <div className="w-full max-w-[2000px] mx-auto flex h-16 items-center justify-between px-6 md:px-8 lg:px-12">
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="flex items-center space-x-2"
              >
                <img 
                  src="/header_logo.jpg" 
                  alt="EmoSpend Logo"
                  className="h-8 w-auto object-contain"
                />
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                  EmoSpend
                </span>
              </motion.div>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <SyncIndicator />
            <ModeToggle />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b backdrop-blur transition-all duration-200",
        scrolled ? "bg-background/95 border-primary/10" : "bg-transparent border-transparent",
      )}
    >
      <div className="w-full max-w-[2000px] mx-auto flex h-16 items-center justify-between px-6 md:px-8 lg:px-12">
        <div className="flex items-center flex-shrink-0">
          <Link href="/" className="flex items-center">
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="flex items-center space-x-2"
            >
              <img 
                src="/header_logo.jpg" 
                alt="EmoSpend Logo"
                className="h-8 w-auto object-contain"
              />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                EmoSpend
              </span>
            </motion.div>
          </Link>
        </div>
        <nav className="flex items-center space-x-4">

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center justify-between md:justify-end space-x-1 md:space-x-2">
            {navItems.map((item, index) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -2 }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3 sm:px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "hover:bg-primary/10 hover:text-primary",
                  )}
                >
                  <item.icon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              </motion.div>
            ))}

            <div className="flex items-center mr-2">
              <SyncIndicator />
            </div>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative h-9 w-9 rounded-full overflow-hidden border-2 border-primary/20 hover:border-primary/50 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      {avatarUrl && <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={displayName} />}
                      <AvatarFallback className="bg-primary/10 text-primary">{userInitial}</AvatarFallback>
                    </Avatar>
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-xl" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="cursor-pointer rounded-lg hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href="/auth/login">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-primary/20 hover:bg-primary/10 hover:text-primary"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                </Link>
              </motion.div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 rounded-full",
                pathname === "/income" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
              )}
            >
              <Link href="/income" aria-label="Income">
                <TrendingUp className="h-4 w-4" />
              </Link>
            </Button>
            <SyncIndicator />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="h-9 w-9 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </nav>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-primary/10 bg-background/95 backdrop-blur"
          >
            <div className="container py-4 space-y-3">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-3 rounded-xl text-base font-medium transition-colors",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-primary/10 hover:text-primary",
                    )}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Link>
                </motion.div>
              ))}

              {user ? (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navItems.length * 0.1 }}
                >
                  <button
                    onClick={() => {
                      signOut()
                      setIsMobileMenuOpen(false)
                    }}
                    className="flex items-center w-full px-4 py-3 rounded-xl text-base font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    Log out
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navItems.length * 0.1 }}
                >
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center px-4 py-3 rounded-xl text-base font-medium bg-primary text-primary-foreground"
                  >
                    <LogIn className="h-5 w-5 mr-3" />
                    Login
                  </Link>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
