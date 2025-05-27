import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Skeleton } from "@/components/ui/skeleton";
  import { SpendingByMoodChart } from "@/components/spending-by-mood-chart";
  import { SpendingByCategory } from "@/components/spending-by-category";
  import { SpendingOverTime } from "@/components/spending-over-time";
  import { SpendingByDay } from "@/components/spending-by-day";
  import { IncomeExpenseChart } from "@/components/income-expense-chart";
  import { motion } from "framer-motion";
  import type { Expense, Income } from "@/types/expense";
  
  interface DashboardChartsProps {
    isLoading: boolean;
    expenses: Expense[];
    incomes: Income[];
    period: 'day' | 'week' | 'month' | 'year';
  }
  
  export function DashboardCharts({
    isLoading,
    expenses = [],
    incomes = [],
    period,
  }: DashboardChartsProps) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="h-full"
          >
            <div className="h-full">
              <IncomeExpenseChart
                expenses={expenses}
                incomes={incomes}
                period={period}
                isLoading={isLoading}
              />
            </div>
          </motion.div>
        </div>
  
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="h-full"
          >
            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">
                  Pengeluaran berdasarkan Mood
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] sm:h-[350px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-[250px] sm:h-[300px] w-full" />
                  </div>
                ) : (
                  <SpendingByMoodChart expenses={expenses} />
                )}
              </CardContent>
            </Card>
          </motion.div>
  
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="h-full"
          >
            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">
                  Pengeluaran berdasarkan Kategori
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] sm:h-[350px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-[250px] sm:h-[300px] w-full" />
                  </div>
                ) : (
                  <SpendingByCategory expenses={expenses} />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
  
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="h-full"
          >
            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">
                  Rata-rata Pengeluaran Harian
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] sm:h-[300px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-[200px] sm:h-[250px] w-full" />
                  </div>
                ) : (
                  <SpendingByDay expenses={expenses} />
                )}
              </CardContent>
            </Card>
          </motion.div>
  
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }} // Note: Original had 0.3, could be 0.5 for sequence
            className="h-full"
          >
            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">
                  Pengeluaran Seiring Waktu
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] sm:h-[300px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-[200px] sm:h-[250px] w-full" />
                  </div>
                ) : (
                  <SpendingOverTime expenses={expenses} />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }