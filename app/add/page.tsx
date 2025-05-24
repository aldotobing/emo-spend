"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Sparkles, PiggyBank, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion } from "framer-motion";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FunMoodSelector } from "@/components/fun-mood-selector";
import { categories } from "@/data/categories";
import { cn } from "@/lib/utils";
import { addExpense, pullExpensesFromSupabase, syncExpenses } from "@/lib/db";
import { useToast } from "@/components/ui/use-toast";
import type { MoodType } from "@/types/expense";

const formSchema = z.object({
  amount: z.coerce.number()
    .positive({ message: "Jumlah harus positif" })
    .max(99999999.99, { message: "Jumlah terlalu besar, maksimum 99.999.999,99" }),
  category: z.string().min(1, { message: "Pilih kategori" }),
  mood: z.string().min(1, { message: "Pilih suasana hatimu" }),
  moodReason: z.string().optional(),
  date: z.date(),
  notes: z.string().optional(),
});

// Indonesian currency formatter
const formatToIDR = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value).replace("Rp", "").trim();
};

// Parse Indonesian formatted number
const parseIDRNumber = (value: string): number => {
  // Remove all non-digit characters except decimal separators
  const cleaned = value.replace(/[^\d,]/g, "");
  // Replace comma with dot for decimal if needed, then parse
  const parsed = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  return isNaN(parsed) ? 0 : parsed;
};

export default function AddExpensePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "" as any,
      category: "",
      mood: "neutral",
      moodReason: "",
      date: new Date(),
      notes: "",
    },
  });

  // Helper function to sync data after successful expense addition
  async function performPostSubmitSync() {
    try {
      console.log("[AddExpense] Starting post-submit data sync...");

      // Pull latest data from Supabase to ensure we have all updates
      await pullExpensesFromSupabase();

      // Sync any pending local changes
      await syncExpenses();

      console.log("[AddExpense] Post-submit sync completed successfully");
    } catch (error) {
      console.error("[AddExpense] Error during post-submit sync:", error);
      // Don't throw error as the expense was already saved successfully
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // Ensure amount is within database limits
      const safeAmount = Math.min(values.amount, 99999999.99);
      
      // Add the expense
      const expenseId = await addExpense({
        amount: safeAmount,
        category: values.category,
        mood: values.mood as MoodType,
        moodReason: values.moodReason,
        date: values.date.toISOString(),
        notes: values.notes,
      });

      if (!expenseId) {
        throw new Error("Failed to add expense");
      }

      toast({
        title: "Pengeluaran ditambahkan! 🎉",
        description:
          "Pengeluaranmu berhasil dicatat dan sedang disinkronisasi.",
        variant: "default",
      });

      // Perform data sync to ensure consistency
      await performPostSubmitSync();

      // Use window.location for a hard refresh to ensure dashboard shows updated data
      window.location.href = "/";
    } catch (error) {
      console.error("Error adding expense:", error);
      toast({
        title: "Ups! Terjadi kesalahan 😕",
        description: "Gagal menambahkan pengeluaran. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center py-4 md:py-10 bg-gradient-to-b from-background to-primary/5 px-4 md:px-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl md:rounded-3xl overflow-hidden shadow-lg border border-primary/20">
          {/* Header Section */}
          <div className="bg-primary/10 p-4 md:p-6 text-center relative overflow-hidden">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
              className="absolute top-3 right-3 md:top-4 md:right-4"
            >
              <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
              className="h-16 w-16 md:h-20 md:w-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4"
            >
              <PiggyBank className="h-8 w-8 md:h-10 md:w-10 text-primary" />
            </motion.div>

            <h1 className="text-xl md:text-2xl font-bold mb-1">Tambah Pengeluaran Baru</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Catat pengeluaran dan perasaanmu
            </p>
          </div>

          {/* Form Section */}
          <div className="p-4 md:p-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 md:space-y-6"
              >
                {/* Amount Field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => {
                      const [displayValue, setDisplayValue] = useState(
                        field.value ? formatToIDR(field.value) : ""
                      );

                      // Sync local displayValue if field.value changes externally
                      useEffect(() => {
                        if (!field.value) {
                          setDisplayValue("");
                        } else {
                          setDisplayValue(formatToIDR(field.value));
                        }
                      }, [field.value]);

                      return (
                        <FormItem>
                          <FormLabel className="text-foreground/80 text-sm md:text-base">
                            Jumlah
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="0"
                                value={displayValue}
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  const numericValue = parseIDRNumber(inputValue);
                                  
                                  // Update display with formatted value
                                  if (inputValue === "") {
                                    setDisplayValue("");
                                    field.onChange(0);
                                  } else {
                                    setDisplayValue(formatToIDR(numericValue));
                                    field.onChange(numericValue);
                                  }
                                }}
                                className="pl-12 md:pl-10 rounded-xl border-primary/20 focus-visible:ring-primary/30 bg-background/50 font-semibold text-base md:text-base h-12 md:h-auto"
                                inputMode="numeric"
                                autoComplete="off"
                              />
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-base font-medium">
                                Rp
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs md:text-sm" />
                        </FormItem>
                      );
                    }}
                  />
                </motion.div>

                {/* Category Field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80 text-sm md:text-base">
                          Kategori
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-primary/20 focus-visible:ring-primary/30 bg-background/50 h-12 md:h-auto">
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
                        <FormMessage className="text-xs md:text-sm" />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* Date Field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => {
                      const [isCalendarOpen, setIsCalendarOpen] = useState(false);
                      
                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-foreground/80 text-sm md:text-base">
                            Tanggal
                          </FormLabel>
                          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal rounded-xl border-primary/20 focus-visible:ring-primary/30 bg-background/50 h-12 md:h-auto",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  onClick={() => setIsCalendarOpen(true)}
                                >
                                  {field.value ? (
                                    format(field.value, "PPPP", { locale: id })
                                  ) : (
                                    <span>Pilih tanggal</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="w-auto p-0 shadow-lg border border-primary/20" 
                              align="start"
                              sideOffset={4}
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setIsCalendarOpen(false); // Auto-close calendar
                                }}
                                disabled={(date) =>
                                  date > new Date() ||
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                                locale={id}
                                className="rounded-lg"
                                classNames={{
                                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                  month: "space-y-4",
                                  caption: "flex justify-center pt-1 relative items-center",
                                  caption_label: "text-sm font-medium",
                                  nav: "space-x-1 flex items-center",
                                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-primary/10 rounded-md transition-colors",
                                  nav_button_previous: "absolute left-1",
                                  nav_button_next: "absolute right-1",
                                  table: "w-full border-collapse space-y-1",
                                  head_row: "flex",
                                  head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                                  row: "flex w-full mt-2",
                                  cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/10 hover:text-primary rounded-md transition-colors",
                                  day_range_end: "day-range-end",
                                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                  day_today: "bg-accent text-accent-foreground font-semibold",
                                  day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                                  day_disabled: "text-muted-foreground opacity-50",
                                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                                  day_hidden: "invisible",
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage className="text-xs md:text-sm" />
                        </FormItem>
                      );
                    }}
                  />
                </motion.div>

                {/* Mood Field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <FormField
                    control={form.control}
                    name="mood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80 text-sm md:text-base">
                          Bagaimana perasaanmu?
                        </FormLabel>
                        <FormControl>
                          <FunMoodSelector
                            value={field.value as MoodType}
                            onChange={(mood, reason) => {
                              field.onChange(mood);
                              form.setValue("moodReason", reason || "");
                            }}
                          />
                        </FormControl>
                        <FormMessage className="text-xs md:text-sm" />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* Notes Field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80 text-sm md:text-base">
                          Catatan (Opsional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tambahkan detail lainnya..."
                            className="resize-none rounded-xl border-primary/20 focus-visible:ring-primary/30 bg-background/50 min-h-[80px] md:min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs md:text-sm" />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="pt-2"
                >
                  <Button
                    type="submit"
                    className="w-full rounded-xl py-6 text-base font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary h-12 md:h-auto md:py-6"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
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
  );
}