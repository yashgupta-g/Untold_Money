"use client";

import { CircleNotch, Warning } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { PortfolioAllocationData } from "@/store/api/portfolioApi";

// Colorblind-safe categorical order for the light surface. Keep the order:
// it's what keeps adjacent slices distinguishable.
const COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

function formatINR(v: number) {
  return v.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { allocation_percent: number } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="border border-border/60 bg-popover px-3 py-2">
      <p className="text-sm font-semibold">{item.name}</p>
      <p className="text-xs text-muted-foreground">
        ₹{formatINR(item.value)} ({item.payload.allocation_percent}%)
      </p>
    </div>
  );
}

interface AllocationChartProps {
  allocation: PortfolioAllocationData;
  isLoading?: boolean;
}

export function AllocationChart({ allocation, isLoading }: AllocationChartProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-16">
          <CircleNotch className="h-6 w-6 animate-spin text-primary-ink" />
        </CardContent>
      </Card>
    );
  }

  if (!allocation || allocation.holdings.length === 0) return null;

  const holdingData = allocation.holdings.map((h) => ({
    name: h.symbol,
    value: h.market_value,
    allocation_percent: h.allocation_percent,
  }));

  const sectorData = allocation.sector_breakdown.map((s) => ({
    name: s.sector,
    value: s.total_value,
    allocation_percent: s.allocation_percent,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Holdings Allocation Donut */}
      <Card className="border-border/50">
        <CardHeader className="pb-2 pt-5 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Holding Allocation
            </CardTitle>
            {allocation.concentration_risk && (
              <Badge
                variant="destructive"
                className="gap-1 text-[10px] font-medium"
              >
                <Warning className="h-3 w-3" />
                Concentration Risk
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={holdingData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {holdingData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[i % COLORS.length]}
                    className="transition-opacity duration-200 hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sector Breakdown */}
      <Card className="border-border/50">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-base font-semibold">
            Sector Allocation
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="space-y-3">
            {sectorData.map((s, i) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{s.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {s.allocation_percent}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${s.allocation_percent}%`,
                      backgroundColor: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  ₹{formatINR(s.value)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
