"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { motion } from "framer-motion";
import { Sparkles, Smile, ArrowRight, Eye, EyeOff } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    
    try {
      const result = await signIn(values.email, values.password);
      
      if (result?.error) {
        throw new Error(result.error.message || "Failed to sign in. Please try again.");
      }
      
      toast.success("Welcome back!");
      
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.message !== 'Navigation cancelled from signInWithGoogle') {
        toast.error("Login Failed", {
          description: error?.message || "Invalid email or password. Please try again."
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      if (error.message !== 'Navigation cancelled from signInWithGoogle') {
        toast.error("Google sign-in failed", {
          description: error.message || "An error occurred during Google sign-in. Please try again.",
        });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center p-2 bg-background">
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ 
          opacity: isMounted ? 1 : 0,
          x: isMounted ? 0 : 100,
        }}
        transition={{ 
          duration: 0.6, 
          ease: [0.4, 0, 0.2, 1],
          delay: 0.2
        }}
        className="w-full max-w-md mx-auto"
      >
        {/* Background decorative elements for desktop */}
        <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.1, scale: 1 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
            className="absolute top-20 left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.1, scale: 1 }}
            transition={{ duration: 2, delay: 1, repeat: Infinity, repeatType: "reverse" }}
            className="absolute bottom-20 right-20 w-96 h-96 bg-primary/15 rounded-full blur-3xl"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm md:max-w-md relative z-10"
        >
          {/* Desktop: Enhanced card with backdrop blur */}
          <div className="bg-background rounded-2xl overflow-hidden shadow-2xl border border-border/50 max-h-[90vh] overflow-y-auto">
            {/* Header section - more compact on mobile */}
            <div className="bg-background p-3 text-center relative overflow-hidden border-b border-border/50 sticky top-0">
              {/* Floating sparkles animation */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="absolute top-3 md:top-4 right-3 md:right-4"
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                className="absolute top-8 md:top-12 left-3 md:left-6"
              >
                <motion.div
                  animate={{ rotate: [360, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                >
                  <Smile className="h-4 w-4 md:h-5 md:w-5 text-primary/60" />
                </motion.div>
              </motion.div>

              <motion.div
                className="flex items-center justify-center space-x-2 mb-3 md:mb-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Logo placeholder */}
              </motion.div>

              <motion.h1 
                className="text-lg md:text-2xl font-bold mb-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Welcome Back!
              </motion.h1>
              <motion.p 
                className="text-xs md:text-base text-muted-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Sign in to continue your journey
              </motion.p>
            </div>

            {/* Form section */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Google Sign-in Button */}
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="mb-2"
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full py-2 px-4 rounded-xl flex items-center justify-center gap-2"
                >
                  {isGoogleLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                      className="mr-2"
                    >
                      <div className="h-5 w-5 border-2 border-primary/50 border-t-primary rounded-full" />
                    </motion.div>
                  ) : (
                    <svg
                      className="w-5 h-5 mr-2"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  Continue with Google
                </Button>
              </motion.div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300/50 dark:border-gray-700/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                    Or continue with email
                  </span>
                </div>
              </div>

              {/* Email/Password Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-1 mb-2">
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="you@example.com"
                            type="email"
                            {...field}
                            className="py-3 px-4 text-base rounded-lg border-border/50 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 transition-colors"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="space-y-1 mb-2">
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <Link
                            href="/auth/forgot-password"
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Forgot password?
                          </Link>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="••••••••"
                              type={showPassword ? "text" : "password"}
                              {...field}
                              className="py-3 px-4 text-base rounded-lg border-border/50 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 pr-10 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="pt-2"
                  >
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 text-base font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200 shadow-sm hover:shadow-md"
                    >
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                          }}
                          className="h-5 w-5 border-2 border-white/50 border-t-white rounded-full"
                        />
                      ) : (
                        <span className="flex items-center">
                          Sign In <ArrowRight className="ml-2 h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </Form>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-4 text-center text-sm text-muted-foreground"
              >
                <p>
                  Don't have an account?{' '}
                  <Link
                    href="/auth/register"
                    className="text-primary hover:underline font-medium transition-colors duration-200"
                  >
                    Sign up
                  </Link>
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
