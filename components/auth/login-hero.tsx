'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, TrendingUp, Brain, Sparkles } from 'lucide-react';
import Link from 'next/link';

const taglines = [
  { text: "Understand your spending habits with emotional intelligence", emoji: "🧠" },
  { text: "Track expenses, understand feelings, make better choices", emoji: "📊" },
  { text: "Discover the emotions behind your spending patterns", emoji: "🔍" },
  { text: "Your financial wellness journey starts with awareness", emoji: "✨" },
  { text: "Turn emotional spending into mindful decisions", emoji: "💡" },
  { text: "See beyond the numbers - understand the 'why'", emoji: "🔮" }
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

interface LoginHeroProps {
  onLoginClick?: () => void;
}

export function LoginHero({ onLoginClick }: LoginHeroProps) {
  const [currentTagline, setCurrentTagline] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right'>('left');
  const router = useRouter();

  const handleLoginClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setExitDirection('left');
    setIsExiting(true);
    // Wait for exit animation to complete before navigating
    setTimeout(() => {
      if (onLoginClick) {
        onLoginClick();
      } else {
        router.push('/auth/login');
      }
    }, 600); // Match this with the exit animation duration
  };

  const handleGetStartedClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setExitDirection('right');
    setIsExiting(true);
    // Wait for exit animation to complete before navigating
    setTimeout(() => {
      router.push('/auth/register');
    }, 600); // Match this with the exit animation duration
  };

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentTagline((prev) => (prev + 1) % taglines.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-120px)] md:min-h-[calc(100vh-200px)] px-4 text-center overflow-hidden">
      {/* Static background orbs - hidden on mobile for cleaner look */}
      <div className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 blur-xl top-20 left-20 hidden md:block" />
      <div className="absolute w-48 h-48 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 blur-xl bottom-32 right-20 hidden md:block" />
      <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 blur-xl top-1/3 right-32 hidden md:block" />
      
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
        initial={{ opacity: 0, y: 50, x: 0 }}
        animate={{ 
          opacity: isVisible ? (isExiting ? 0 : 1) : 0, 
          y: isVisible ? (isExiting ? -50 : 0) : 50,
          x: isExiting ? -100 : 0,
          scale: isExiting ? 0.9 : 1
        }}
        transition={{ 
          duration: isExiting ? 0.6 : 1, 
          ease: isExiting ? [0.4, 0, 0.2, 1] : "easeOut",
          opacity: { duration: isExiting ? 0.4 : 0.8 },
          x: { duration: isExiting ? 0.6 : 0 }
        }}
      >
        <AnimatedTitle text="Welcome to EmoSpend" />
        
        {/* Animated subtitle - more compact on mobile */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mb-4 md:mb-8"
        >
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Smart Financial Wellness Platform
          </h2>
        </motion.div>
        
        {/* Dynamic tagline with responsive height */}
        <div className="h-24 sm:h-28 md:h-36 flex flex-col items-center justify-center mb-8 md:mb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTagline}
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            >
              <span className="text-3xl mb-2 block">
                {taglines[currentTagline].emoji}
              </span>
              <AnimatedTagline text={taglines[currentTagline].text} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Buttons container */}
        <div className="flex flex-col sm:flex-row gap-4 md:gap-8 justify-center px-4 sm:px-0 w-full max-w-md mx-auto">
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Button 
              asChild 
              size="lg" 
              className="text-base md:text-lg px-10 py-6 rounded-full shadow-lg border-0 w-full sm:w-auto bg-gradient-to-br from-primary to-primary/90"
            >
              <Link href="/auth/login" className="flex items-center justify-center">
                <span className="font-semibold text-white">Get Started</span>
                <ArrowRight className="ml-3 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Feature highlights */}
        <div className="mt-12 md:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8 text-sm sm:text-base text-slate-600 dark:text-slate-300 px-2 sm:px-0 max-w-5xl mx-auto">
          {[
            { icon: "🧠", text: "AI-Powered Insights" },
            { icon: "💡", text: "Behavioral Analytics" },
            { icon: "🎯", text: "Personalized Goals" }
          ].map((feature, index) => (
            <div
              key={index}
              className="flex items-center justify-center space-x-2 p-2 sm:p-4 rounded-lg md:rounded-xl bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm border border-primary/10"
            >
              <span className="text-lg sm:text-2xl">{feature.icon}</span>
              <span>{feature.text}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}