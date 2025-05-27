import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { motion } from "framer-motion";

type Period = "week" | "month" | "year";

interface PeriodControlsProps {
  currentPeriod: Period;
  onPeriodChange: (newPeriod: Period) => void;
  onGenerateInsights: () => void;
  isGeneratingInsights: boolean;
  isLoading: boolean;
  noApiKeysConfigured: boolean;
}

export function PeriodControls({
  currentPeriod,
  onPeriodChange,
  onGenerateInsights,
  isGeneratingInsights,
  isLoading,
  noApiKeysConfigured,
}: PeriodControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <Tabs
        defaultValue={currentPeriod}
        onValueChange={(value) => onPeriodChange(value as Period)}
        className="w-full sm:w-auto"
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="week" className="flex-1 sm:flex-none">
            Minggu Ini
          </TabsTrigger>
          <TabsTrigger value="month" className="flex-1 sm:flex-none">
            Bulan Ini
          </TabsTrigger>
          <TabsTrigger value="year" className="flex-1 sm:flex-none">
            Tahun Ini
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Button
        variant="outline"
        size="sm"
        onClick={onGenerateInsights}
        disabled={
          isGeneratingInsights || isLoading || noApiKeysConfigured
        }
        className="flex items-center gap-2 border-primary/20 hover:border-primary/50 focus-visible:ring-primary/60"
      >
        {isGeneratingInsights ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          >
            <Zap className="h-4 w-4" />
          </motion.div>
        ) : (
          <Zap className="h-4 w-4" />
        )}
        {isGeneratingInsights ? "Menganalisis..." : "Analisa AI"}
      </Button>
    </div>
  );
}