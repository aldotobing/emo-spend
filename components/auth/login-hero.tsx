'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, TrendingUp, Brain, Sparkles } from 'lucide-react';
import Link from 'next/link';

const taglines = [
  "Understand your spending habits with emotional intelligence",
  "Track expenses, understand feelings, make better choices",
  "Discover the emotions behind your spending patterns",
  "Your financial wellness journey starts with awareness",
  "Turn emotional spending into mindful decisions",
  "See beyond the numbers - understand the 'why'"
];

const floatingIcons = [
  { Icon: Heart, delay: 0, x: -100, y: -50 },
  { Icon: TrendingUp, delay: 1, x: 100, y: -80 },
  { Icon: Brain, delay: 2, x: -80, y: 50 },
  { Icon: Sparkles, delay: 1.5, x: 120, y: 60 }
];

interface AnimatedWordProps {
  children: React.ReactNode;
  delay?: number;
}

const AnimatedWord = ({ children, delay = 0 }: AnimatedWordProps) => (
  <motion.span
    initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    transition={{ 
      duration: 0.8, 
      delay,
      type: "spring",
      stiffness: 100,
      damping: 10
    }}
    className="inline-block mr-2"
  >
    {children}
  </motion.span>
);

interface AnimatedTitleProps {
  text: string;
}

const AnimatedTitle = ({ text }: AnimatedTitleProps) => {
  const words = text.split(' ');
  return (
    <h1 className="text-3xl sm:text-4xl md:text-7xl font-bold mb-4 md:mb-8 relative">
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1, type: "spring", stiffness: 100 }}
        className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent relative z-10"
      >
        {words.map((word, index) => (
          <AnimatedWord key={index} delay={index * 0.1}>
            {word}
          </AnimatedWord>
        ))}
      </motion.div>
      
      {/* Animated background glow */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 blur-3xl"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </h1>
  );
};

interface AnimatedTaglineProps {
  text: string;
}

const AnimatedTagline = ({ text }: AnimatedTaglineProps) => {
  const words = text.split(' ');
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="text-lg sm:text-xl md:text-2xl text-slate-600 dark:text-slate-300 font-medium px-2 md:px-0"
    >
      {words.map((word, index) => (
        <motion.span
          key={`${text}-${index}`}
          initial={{ opacity: 0, y: 10, rotateX: -90 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{
            duration: 0.5,
            delay: index * 0.08,
            type: "spring",
            stiffness: 200,
            damping: 10
          }}
          className="inline-block mr-2 transform-gpu"
          style={{ transformPerspective: 1000 }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

interface FloatingIconProps {
  Icon: React.ComponentType<{ size: number }>;
  delay: number;
  x: number;
  y: number;
}

const FloatingIcon = ({ Icon, delay, x, y }: FloatingIconProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: [0, 1, 0.7, 1],
      scale: [0, 1.2, 0.8, 1],
      x: [0, x/2, x],
      y: [0, y/2, y]
    }}
    transition={{
      duration: 3,
      delay,
      repeat: Infinity,
      repeatType: "reverse",
      ease: "easeInOut"
    }}
    className="absolute text-primary/30"
  >
    <Icon size={32} />
  </motion.div>
);

interface PulsingOrbProps {
  delay: number;
  size?: string;
  position: string;
}

const PulsingOrb = ({ delay, size = "w-32 h-32", position }: PulsingOrbProps) => (
  <motion.div
    className={`absolute ${size} rounded-full bg-gradient-to-r from-primary/10 to-primary/5 blur-xl ${position}`}
    animate={{
      scale: [1, 1.5, 1],
      opacity: [0.3, 0.6, 0.3],
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  />
);

export function LoginHero() {
  const [currentTagline, setCurrentTagline] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentTagline((prev) => (prev + 1) % taglines.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-120px)] md:min-h-[calc(100vh-200px)] px-4 text-center overflow-hidden">
      {/* Animated background orbs - hidden on mobile for cleaner look */}
      <PulsingOrb delay={0} position="top-20 left-20 hidden md:block" />
      <PulsingOrb delay={1} size="w-48 h-48" position="bottom-32 right-20 hidden md:block" />
      <PulsingOrb delay={2} size="w-24 h-24" position="top-1/3 right-32 hidden md:block" />
      
      {/* Floating icons - reduced on mobile */}
      <div className="absolute inset-0 pointer-events-none">
        {floatingIcons.slice(0, 2).map((icon, index) => (
          <div key={index} className="md:hidden">
            <FloatingIcon {...icon} />
          </div>
        ))}
        {floatingIcons.map((icon, index) => (
          <div key={index} className="hidden md:block">
            <FloatingIcon {...icon} />
          </div>
        ))}
      </div>

      <motion.div 
        className="max-w-4xl mx-auto relative z-10"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 50 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <AnimatedTitle text="Welcome to EmoSpend" />
        
        {/* Animated subtitle - more compact on mobile */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mb-4 md:mb-8"
        >
          <motion.p
            className="text-base md:text-xl text-primary font-semibold mb-2"
            animate={{ 
              textShadow: [
                "0 0 0px rgba(var(--primary-rgb), 0)",
                "0 0 10px rgba(var(--primary-rgb), 0.3)",
                "0 0 0px rgba(var(--primary-rgb), 0)"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Smart Financial Wellness Platform
          </motion.p>
        </motion.div>
        
        {/* Dynamic tagline with responsive height */}
        <div className="h-20 sm:h-24 md:h-32 flex items-center justify-center mb-8 md:mb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTagline}
              initial={{ opacity: 0, y: 30, rotateX: -90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -30, rotateX: 90 }}
              transition={{ 
                duration: 0.6,
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
              style={{ transformPerspective: 1000 }}
            >
              <AnimatedTagline text={taglines[currentTagline]} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Animated buttons - more compact on mobile */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center px-4 sm:px-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <motion.div
            whileHover={{ 
              scale: 1.05, 
              boxShadow: "0 20px 40px rgba(var(--primary-rgb), 0.3)"
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button 
              asChild 
              size="lg" 
              className="text-base md:text-lg px-6 md:px-8 py-3 md:py-4 shadow-xl border-0 relative overflow-hidden group w-full sm:w-auto"
            >
              <Link href="/auth/register">
                <motion.span
                  className="relative z-10 flex items-center"
                  initial={{ x: 0 }}
                  whileHover={{ x: 2 }}
                >
                  Get Started 
                  <motion.div
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="ml-2"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </motion.div>
                </motion.span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6 }}
                />
              </Link>
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 10px 30px rgba(var(--primary-rgb), 0.2)"
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button 
              variant="outline" 
              size="lg" 
              asChild 
              className="text-base md:text-lg px-6 md:px-8 py-3 md:py-4 border-2 border-primary/20 hover:border-primary/40 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm relative overflow-hidden group w-full sm:w-auto"
            >
              <Link href="/auth/login">
                <span className="relative z-10 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent font-semibold">
                  Sign In
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Feature highlights - simplified for mobile */}
        <motion.div
          className="mt-8 md:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400 px-2 sm:px-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
        >
          {[
            { icon: "🧠", text: "AI-Powered Insights" },
            { icon: "💡", text: "Behavioral Analytics" },
            { icon: "🎯", text: "Personalized Goals" }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.8 + index * 0.2 }}
              className="flex items-center justify-center space-x-2 p-2 sm:p-4 rounded-lg md:rounded-xl bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm border border-primary/10"
              whileHover={{ 
                scale: 1.05,
                backgroundColor: "rgba(var(--primary-rgb), 0.1)"
              }}
            >
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: index * 0.5 }}
                className="text-lg sm:text-2xl"
              >
                {feature.icon}
              </motion.span>
              <span className="font-medium text-center">{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}