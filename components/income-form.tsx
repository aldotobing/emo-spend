'use client';

import { useState } from 'react';
import { addIncome } from '@/lib/income';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const INCOME_SOURCES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Gift',
  'Other'
];

interface IncomeFormProps {
  onSuccess?: () => void;
  initialData?: {
    amount?: number;
    source?: string;
    description?: string;
    date?: string;
  };
}

// Indonesian currency formatter
const formatToIDR = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function IncomeForm({ onSuccess, initialData }: IncomeFormProps) {
  const [amount, setAmount] = useState(initialData?.amount ? formatToIDR(initialData.amount) : '');
  const [source, setSource] = useState(initialData?.source || INCOME_SOURCES[0]);
  const [description, setDescription] = useState(initialData?.description || '');
  const [date, setDate] = useState<Date | undefined>(
    initialData?.date ? new Date(initialData.date) : new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse Indonesian formatted number
  const parseIDRNumber = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, '');
    const parsed = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const parsedAmount = parseIDRNumber(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Masukkan jumlah yang valid');
      return;
    }

    if (!date) {
      setError('Please select a date');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const incomeData = {
        user_id: user.id,
        amount: parseIDRNumber(amount),
        source,
        description: description || undefined,
        date: format(date || new Date(), 'yyyy-MM-dd'),
      };

      const result = await addIncome(incomeData);
      
      if (!result) {
        throw new Error('Failed to add income');
      }

      // Reset form
      if (!initialData) {
        setAmount('');
        setDescription('');
        setDate(new Date());
      }

      onSuccess?.();
    } catch (err) {
      console.error('Error adding income:', err);
      setError('Failed to add income. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="amount">Jumlah</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
          <Input
            id="amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              const value = e.target.value;
              // Allow only numbers and decimal separators
              if (/^\d*[.,]?\d*$/.test(value) || value === '') {
                // Format the number as the user types
                const num = parseIDRNumber(value);
                if (!isNaN(num) && num >= 0) {
                  setAmount(formatToIDR(num));
                } else if (value === '') {
                  setAmount('');
                }
              }
            }}
            onBlur={(e) => {
              const num = parseIDRNumber(e.target.value);
              if (!isNaN(num) && num >= 0) {
                setAmount(formatToIDR(num));
              }
            }}
            className="pl-10 text-base h-12 bg-background"
            placeholder="0"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="source">Sumber</Label>
        <Select value={source} onValueChange={setSource} disabled={isSubmitting}>
          <SelectTrigger className="h-12 bg-background">
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            {INCOME_SOURCES.map((src) => (
              <SelectItem key={src} value={src}>
                {src}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Tanggal</Label>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-12 bg-background",
                !date && "text-muted-foreground"
              )}
              disabled={isSubmitting}
              type="button"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pilih tanggal</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(selectedDate) => {
                setDate(selectedDate);
                setIsCalendarOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Keterangan (Opsional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[100px] bg-background"
          placeholder="Tambahkan catatan atau deskripsi"
          disabled={isSubmitting}
        />
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 text-base font-medium"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {initialData ? 'Updating...' : 'Adding...'}
          </>
        ) : (
          <>{initialData ? 'Update Income' : 'Add Income'}</>
        )}
      </Button>
    </form>
  );
}
