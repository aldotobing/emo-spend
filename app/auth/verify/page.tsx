"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { CheckCircle, Sparkles } from "lucide-react"

export default function VerifyPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-gradient-to-b from-background to-primary/5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-8"
      >
        <div className="bg-card rounded-3xl overflow-hidden shadow-lg border border-primary/20">
          <div className="bg-primary/10 p-6 text-center relative overflow-hidden">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
              className="absolute top-4 right-4"
            >
              <Sparkles className="h-6 w-6 text-primary" />
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
              transition={{
                delay: 0.3,
                type: "spring",
                stiffness: 100,
                rotate: { delay: 0.5, duration: 0.5, repeat: 1 },
              }}
              className="h-20 w-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="h-10 w-10 text-primary" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-bold mb-1"
            >
              Check Your Email!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-muted-foreground"
            >
              We've sent you a verification link
            </motion.p>
          </div>

          <div className="p-6 text-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              <p className="text-muted-foreground mb-6">
                Please check your email inbox and click on the verification link to activate your account. If you don't
                see the email, check your spam folder.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href="/auth/login">
                <Button
                  variant="outline"
                  className="w-full rounded-xl py-6 text-base font-medium border-primary/20 hover:bg-primary/5"
                >
                  Back to Login
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-6"
        >
          <p className="text-sm text-muted-foreground">Didn't receive an email? Check your spam folder or try again.</p>
        </motion.div>
      </motion.div>
    </div>
  )
}
