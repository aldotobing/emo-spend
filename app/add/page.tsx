"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, Sparkles, PiggyBank, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { FunMoodSelector } from "@/components/fun-mood-selector"
import { categories } from "@/data/categories"
import { cn } from "@/lib/utils"
import { addExpense } from "@/lib/db"
import { useToast } from "@/components/ui/use-toast"
import type { MoodType } from "@/types/expense"

const formSchema = z.object({
  amount: z.coerce.number().positive({ message: "Jumlah harus positif" }),
  category: z.string().min(1, { message: "Pilih kategori" }),
  mood: z.string().min(1, { message: "Pilih suasana hatimu" }),
  moodReason: z.string().optional(),
  date: z.date(),
  notes: z.string().optional(),
})

export default function AddExpensePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: undefined,
      category: "",
      mood: "neutral",
      moodReason: "",
      date: new Date(),
      notes: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      await addExpense({
        amount: values.amount,
        category: values.category,
        mood: values.mood as MoodType,
        moodReason: values.moodReason,
        date: values.date.toISOString(),
        notes: values.notes,
      })

      toast({
        title: "Pengeluaran ditambahkan! 🎉",
        description: "Pengeluaranmu berhasil dicatat.",
        variant: "success",
      })

      router.push("/")
    } catch (error) {
      console.error("Error adding expense:", error)
      toast({
        title: "Ups! Terjadi kesalahan 😕",
        description: "Gagal menambahkan pengeluaran. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center py-10 bg-gradient-to-b from-background to-primary/5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-4"
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
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
              className="h-20 w-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <PiggyBank className="h-10 w-10 text-primary" />
            </motion.div>

            <h1 className="text-2xl font-bold mb-1">Tambah Pengeluaran Baru</h1>
            <p className="text-muted-foreground">Catat pengeluaran dan perasaanmu</p>
          </div>

          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Jumlah</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
                            <Input
                              placeholder="0"
                              {...field}
                              className="pl-10 rounded-xl border-primary/20 focus-visible:ring-primary/30 bg-background/50"
                              type="number"
                              step="1000"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Kategori</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-primary/20 focus-visible:ring-primary/30 bg-background/50">
                              <SelectValue placeholder="Pilih kategori" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                <span className="flex items-center">
                                  <span className="mr-2">{category.icon}</span>
                                  <span>{category.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-foreground/80">Tanggal</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal rounded-xl border-primary/20 focus-visible:ring-primary/30 bg-background/50",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                  <FormField
                    control={form.control}
                    name="mood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Bagaimana perasaanmu?</FormLabel>
                        <FormControl>
                          <FunMoodSelector
                            value={field.value as MoodType}
                            onChange={(mood, reason) => {
                              field.onChange(mood)
                              form.setValue("moodReason", reason || "")
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Catatan (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tambahkan detail lainnya..."
                            className="resize-none rounded-xl border-primary/20 focus-visible:ring-primary/30 bg-background/50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    className="w-full rounded-xl py-6 text-base font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
                    disabled={isSubmitting}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        className="mr-2"
                      >
                        <Sparkles className="h-5 w-5" />
                      </motion.div>
                    ) : (
                      <ArrowRight className="mr-2 h-5 w-5" />
                    )}
                    {isSubmitting ? "Menyimpan..." : "Simpan Pengeluaran"}
                  </Button>
                </motion.div>
              </form>
            </Form>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
