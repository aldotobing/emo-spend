import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

type Period = "day" | "week" | "month" | "year";

interface PeriodSelectorTabsProps {
  periods: Period[];
  currentPeriod: Period; // Though not directly used for selection, useful for defaultValue of Tabs
  onPeriodChange: (newPeriod: Period) => void;
}

export function PeriodSelectorTabs({
  periods,
  onPeriodChange,
}: PeriodSelectorTabsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-4 h-10 sm:h-12 rounded-md p-1">
        {periods.map((p) => (
          <TabsTrigger
            key={p}
            value={p}
            onClick={() => onPeriodChange(p)}
            className="capitalize h-8 sm:h-10 w-full text-xs font-medium sm:text-base flex items-center justify-center rounded-sm min-h-[32px] sm:min-h-[40px]"
          >
            {p}
          </TabsTrigger>
        ))}
      </TabsList>
    </motion.div>
  );
}