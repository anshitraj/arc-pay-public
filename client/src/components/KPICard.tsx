import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  loading?: boolean;
  isLast?: boolean;
}

export function KPICard({ title, value, change, changeLabel, icon: Icon, loading, isLast }: KPICardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) return Minus;
    return change > 0 ? TrendingUp : TrendingDown;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return "text-muted-foreground";
    return change > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  };

  const getTrendBg = () => {
    if (change === undefined || change === 0) return "";
    return change > 0 ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30";
  };

  const TrendIcon = getTrendIcon();

  if (loading) {
    return (
      <div className={cn("flex-1 py-5 border border-border rounded-lg bg-card")}>
        <div className="px-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-muted/50 animate-pulse" />
            <div className="w-20 h-3 rounded bg-muted/50 animate-pulse" />
          </div>
          <div className="w-24 h-8 rounded bg-muted/50 animate-pulse mb-1" />
          <div className="w-32 h-3 rounded bg-muted/50 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
      <div className={cn("border border-border rounded-lg bg-card py-5 hover-elevate transition-colors", !isLast && "")} data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="px-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{title}</div>
          </div>
          {change !== undefined && (
            <div className={cn("flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md", getTrendColor(), getTrendBg())}>
              <TrendIcon className="w-2.5 h-2.5" />
              <span>{Math.abs(change).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div className="text-2xl font-semibold tracking-tight mb-1">{value}</div>
        {changeLabel && (
          <div className="text-[11px] text-muted-foreground/70">{changeLabel}</div>
        )}
      </div>
    </div>
  );
}
