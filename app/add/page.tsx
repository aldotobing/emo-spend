"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSyncStatus } from "@/context/sync-context";
import { toast, Toaster } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Sparkles, PiggyBank, ArrowRight, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import styles from "@/styles/toast.module.css";
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
import { addExpense } from "@/lib/db";
import { useSync } from "@/hooks/use-sync";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayValue, setDisplayValue] = useState("");
  // Using sync context for status only
  const syncContext = useSyncStatus();
  const { sync } = useSync();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0, // Initialize with 0 instead of empty string
      category: "",
      mood: "happy", // Set a default mood that's not empty
      moodReason: "",
      date: new Date(new Date().setHours(0, 0, 0, 0)),
      notes: "",
    },
  });

  // Helper function to sync data after successful expense addition
  async function performPostSubmitSync() {
    try {
      // Use the new sync system which handles both pull and push
      await sync({ silent: true });
    } catch (error) {
      console.error("Error during post-submit sync:", error);
      throw error; // Re-throw to handle in the calling function
    }
  }

  // Function to scroll to the first error field
  const scrollToError = (errors: any) => {
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      const element = document.getElementById(firstError);
      if (element) {
        // Calculate position with offset for header
        const headerOffset = 100;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Add visual feedback
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add a temporary highlight class
        element.classList.add('ring-2', 'ring-offset-2', 'ring-primary');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-offset-2', 'ring-primary');
        }, 3000);
      }
    }
  };

  const [submitStatus, setSubmitStatus] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    error?: string;
    amount?: number;
  }>({ status: 'idle' });

  // Handle side effects after state updates
  useEffect(() => {
    if (submitStatus.status === 'success') {
      // Show success message
      toast.custom((t) => (
        <div className={styles.toastContent}>
          <div className="h-5 w-5 flex items-center justify-center text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Pengeluaran berhasil ditambahkan!</p>
            <p className="text-sm text-muted-foreground">
              Berhasil menambahkan pengeluaran sebesar {formatToIDR(submitStatus.amount || 0)}
            </p>
          </div>
        </div>
      ), {
        duration: 4000,
        className: styles.toast,
        style: {
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          padding: 0,
          margin: 0,
          width: 'auto',
          maxWidth: '90%',
        }
      });
      
      // Navigate to home after a short delay
      const timer = setTimeout(() => {
        router.push('/');
      }, 1000);

      return () => clearTimeout(timer);
    } else if (submitStatus.status === 'error') {
      // Show error message
      toast.custom((t) => (
        <div className={styles.toastContent}>
          <div className="h-5 w-5 flex items-center justify-center text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Gagal menambahkan pengeluaran</p>
            <p className="text-sm text-muted-foreground">
              {submitStatus.error || 'Terjadi kesalahan. Silakan coba lagi.'}
            </p>
          </div>
        </div>
      ), {
        duration: 5000,
        className: styles.toast,
        style: {
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          padding: 0,
          margin: 0,
          width: 'auto',
          maxWidth: '90%',
        }
      });
    }
  }, [submitStatus]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    let loadingToast: string | number = '';
    
    // Parse amount to number if it's a string
    let amount: number;
    try {
      const amountStr = String(values.amount || '').trim();
      amount = amountStr.includes('.') || amountStr.includes(',') 
        ? parseIDRNumber(amountStr)
        : Number(amountStr.replace(/\D/g, ''));
        
      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        form.setError('amount', { type: 'validate', message: 'Mohon masukkan jumlah yang valid' });
        return;
      }
    } catch (error) {
      console.error('Error parsing amount:', error);
      setSubmitStatus({
        status: 'error',
        error: 'Format jumlah tidak valid. Contoh: 50.000'
      });
      return;
    }
    
    setSubmitStatus({ status: 'loading' });
    setIsSubmitting(true);
    
    try {
      
      console.log('4. Processing form data');
      
      // Ensure amount is within database limits
      let safeAmount: number;
      try {
        safeAmount = Math.min(amount, 99999999.99);
      } catch (error) {
        console.error('Error calculating safe amount:', error);
        throw new Error('Jumlah tidak valid. Mohon periksa kembali.');
      }
      
      // Format date as YYYY-MM-DD to avoid timezone issues
      const formattedDate = `${values.date.getFullYear()}-${String(values.date.getMonth() + 1).padStart(2, '0')}-${String(values.date.getDate()).padStart(2, '0')}`;
      
      const expenseData = {
        amount: safeAmount,
        category: values.category,
        mood: values.mood as MoodType,
        date: formattedDate,
        notes: values.notes || '',
        moodReason: values.moodReason || '',
      };
      
      console.log('5. Saving expense:', expenseData);

      console.log('10. Saving expense:', expenseData);
      
      // Update loading message
      console.log('11. Updating loading message');
      toast.loading('Menyimpan pengeluaran...', { id: loadingToast });
      
      // Add expense
      console.log('12. Calling addExpense');
      await addExpense(expenseData);
      console.log('13. Expense saved, syncing...');
      
      // Sync data
      console.log('14. Starting post-submit sync');
      await performPostSubmitSync();
      
      // Dismiss loading toast first
      toast.dismiss(loadingToast);
      
      // Update status to success
      setSubmitStatus({
        status: 'success',
        amount: safeAmount
      });
      
    } catch (error) {
      console.error('Error in form submission:', error);
      setSubmitStatus({
        status: 'error',
        error: error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center py-4 lg:py-6 xl:py-8 bg-gradient-to-b from-background to-primary/5 px-4 mb-8 sm:mb-0">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl mx-auto"
      >
        <div className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border/50">
          {/* Header Section - More compact on desktop */}
          <div className="bg-primary/10 p-3 lg:p-4 xl:p-5 text-center relative overflow-hidden">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
              className="absolute top-2 right-2 lg:top-3 lg:right-3"
            >
              <Sparkles className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
              className="h-12 w-12 lg:h-14 lg:w-14 xl:h-16 xl:w-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2 lg:mb-3"
            >
              <PiggyBank className="h-6 w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8 text-primary" />
            </motion.div>

            <h1 className="text-lg lg:text-xl xl:text-2xl font-bold mb-1">Tambah Pengeluaran Baru</h1>
            <p className="text-xs lg:text-sm xl:text-base text-muted-foreground">
              Catat pengeluaran dan perasaanmu
            </p>
          </div>

          {/* Form Section - Tighter spacing on desktop */}
          <div className="p-6 lg:p-8">
            
            <Form {...form}>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  
                  // Prevent multiple submissions
                  if (isSubmitting) return;
                  
                  const values = form.getValues();
                  
                  // Client-side validation before submission
                  const amount = String(values.amount || '').trim();
                  const category = values.category?.trim();
                  
                  // Check required fields
                  if (!amount || amount === '0') {
                    form.setError('amount', { type: 'required', message: 'Mohon isi jumlah' });
                    
                    if (!category) {
                      form.setError('category', { type: 'required', message: 'Pilih kategori' });
                      toast.error('Perhatian', {
                        description: 'Mohon lengkapi form terlebih dahulu',
                        icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
                        className: 'border-amber-200 bg-amber-50',
                        duration: 4000
                      });
                    } else {
                      toast.error('Perhatian', {
                        description: 'Mohon isi jumlah pengeluaran',
                        icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
                        className: 'border-amber-200 bg-amber-50',
                        duration: 4000
                      });
                    }
                    return;
                  }
                  
                  if (!category) {
                    form.setError('category', { type: 'required', message: 'Pilih kategori' });
                    toast.error('Perhatian', {
                      description: 'Mohon pilih kategori pengeluaran',
                      icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
                      className: 'border-amber-200 bg-amber-50',
                      duration: 4000
                    });
                    return;
                  }
                  
                  try {
                    await onSubmit(values);
                  } catch (error) {
                    // Errors are already handled in the onSubmit function
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="space-y-6"
              >
                {/* Two-column layout for amount and category on larger screens */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                  {/* Amount Field */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-1"
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
                            <FormLabel className="text-foreground/80 text-sm lg:text-sm">
                              Jumlah
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  id="amount"
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
                                  className={cn(
                                    "pl-10 lg:pl-9 rounded-lg border-primary/20 focus-visible:ring-primary/30 bg-background/50 font-semibold text-sm lg:text-base h-10 lg:h-9 xl:h-10",
                                    form.formState.errors.amount && "border-red-500"
                                  )}
                                  inputMode="numeric"
                                  autoComplete="off"
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-sm font-medium">
                                  Rp
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
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
                    className="lg:col-span-1"
                  >
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80 text-sm lg:text-sm">
                            Kategori
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger 
                                id="category"
                                className={cn(
                                  "rounded-lg border-primary/20 focus-visible:ring-primary/30 bg-background/50 h-10 lg:h-9 xl:h-10",
                                  form.formState.errors.category && "border-red-500"
                                )}
                              >
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
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                </div>

                {/* Date Field - Full width */}
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
                          <FormLabel className="text-foreground/80 text-sm lg:text-sm">
                            Tanggal
                          </FormLabel>
                          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal rounded-lg border-primary/20 focus-visible:ring-primary/30 bg-background/50 h-10 lg:h-9 xl:h-10 flex items-center justify-between",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  onClick={() => setIsCalendarOpen(true)}
                                  type="button"
                                >
                                  {field.value ? (
                                    format(field.value, "PPPP", { locale: id })
                                  ) : (
                                    <span>Pilih tanggal</span>
                                  )}
                                  <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
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
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    // Create a new date at the start of the selected day to avoid timezone issues
                                    const startOfDay = new Date(date);
                                    startOfDay.setHours(0, 0, 0, 0);
                                    field.onChange(startOfDay);
                                    setIsCalendarOpen(false); // Auto-close calendar
                                  }
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
                          <FormMessage className="text-xs" />
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
                        <FormLabel className="text-foreground/80 text-sm lg:text-sm">
                          Bagaimana perasaanmu?
                        </FormLabel>
                        <FormControl>
                          <div id="mood">
                            <FunMoodSelector
                              value={field.value as MoodType}
                              onChange={(mood, reason) => {
                                field.onChange(mood);
                                form.setValue("moodReason", reason || "");
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* Notes Field - Smaller on desktop */}
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
                        <FormLabel className="text-foreground/80 text-sm lg:text-sm">
                          Catatan (Opsional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tambahkan detail lainnya..."
                            className="resize-none rounded-lg border-primary/20 focus-visible:ring-primary/30 bg-background/50 min-h-[60px] lg:min-h-[70px] xl:min-h-[80px] text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* Submit Button - More compact on desktop */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="pt-1 lg:pt-2"
                >
                  <Button
                    type="submit"
                    className="w-full rounded-lg py-5 lg:py-4 xl:py-5 text-sm lg:text-base font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary h-11 lg:h-10 xl:h-11"
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
                        <Sparkles className="h-4 w-4 lg:h-5 lg:w-5" />
                      </motion.div>
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
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