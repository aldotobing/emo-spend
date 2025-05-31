"use client";

import { useState } from "react";
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
  const router = useRouter();

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
    <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center p-2 md:p-4 bg-gradient-to-br from-background via-primary/5 to-primary/10 overflow-hidden">
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
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-primary/20 md:border-primary/30">
          {/* Header section - more compact on mobile */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 md:p-5 text-center relative overflow-hidden">
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
              {/* Logo placeholder - uncomment and adjust when logo is available */}
              {/* <img 
                src="/header_logo.jpg" 
                alt="EmoSpend Logo"
                className="h-8 md:h-12 w-auto object-contain"
              />
              <span className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                EmoSpend
              </span> */}
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

          {/* Form section - more compact spacing on mobile */}
          <div className="p-3 md:p-5">
            {/* Google Sign-in Button - enhanced hover effects */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="mb-3 md:mb-5"
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full rounded-xl py-4 md:py-5 text-sm md:text-base font-medium border-primary/20 hover:bg-primary/5 hover:border-primary/30 relative transition-all duration-200 shadow-sm hover:shadow-md"
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
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                  </motion.div>
                ) : (
                  <svg className="mr-2 h-4 w-4 md:h-5 md:w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                {isGoogleLoading ? "Signing in..." : "Continue with Google"}
              </Button>
            </motion.div>

            {/* Divider - more subtle on mobile */}
            <div className="relative my-3 md:my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-primary/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground/80">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Form with enhanced styling */}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-3 md:space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80 text-sm md:text-base">
                        Email
                      </FormLabel>
                      <FormControl>
                        <motion.div
                          whileFocus={{ scale: 1.01 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Input
                            placeholder="your.email@example.com"
                            {...field}
                            className="rounded-xl border-primary/20 focus-visible:ring-primary/30 bg-background/50 hover:bg-background/70 transition-all duration-200 h-10 md:h-11 text-sm md:text-base"
                          />
                        </motion.div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80 text-sm md:text-base">
                        Password
                      </FormLabel>
                      <FormControl>
                        <motion.div
                          whileFocus={{ scale: 1.01 }}
                          transition={{ duration: 0.2 }}
                          className="relative"
                        >
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                            className="rounded-xl border-primary/20 focus-visible:ring-primary/30 bg-background/50 hover:bg-background/70 transition-all duration-200 h-10 md:h-11 text-sm md:text-base pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </motion.div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Enhanced submit button */}
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="pt-1 md:pt-2"
                >
                  <Button
                    type="submit"
                    className="w-full rounded-xl py-4 md:py-5 text-sm md:text-base font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
                        className="mr-2"
                      >
                        <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                      </motion.div>
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                    )}
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </motion.div>
              </form>
            </Form>

            {/* Footer link - more compact on mobile */}
            <motion.div 
              className="mt-3 md:mt-4 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-sm md:text-base text-muted-foreground">
                Don&apos;t have an account?{" "}
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

        {/* Floating elements for desktop enhancement */}
        <div className="hidden lg:block">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="absolute -top-4 -left-4 w-8 h-8 bg-primary/10 rounded-full blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute -bottom-4 -right-4 w-12 h-12 bg-primary/5 rounded-full blur-sm"
          />
        </div>
      </motion.div>
    </div>
  );
}