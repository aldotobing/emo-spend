'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const taglines = [
  "Understand your spending habits with emotional intelligence",
  "Track expenses, understand feelings, make better choices",
  "Discover the emotions behind your spending patterns",
  "Your financial wellness journey starts with awareness",
  "Turn emotional spending into mindful decisions",
  "See beyond the numbers - understand the 'why'"
];

export function LoginHero() {
  const [currentTagline, setCurrentTagline] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTagline((prev) => (prev + 1) % taglines.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 text-center">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Welcome to EmoSpend
        </h1>
        
        <div className="h-20 md:h-24 flex items-center justify-center mb-8">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentTagline}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-lg md:text-xl text-muted-foreground"
            >
              {taglines[currentTagline]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="text-base">
            <Link href="/auth/register">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild className="text-base">
            <Link href="/auth/login">
              Sign In
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
