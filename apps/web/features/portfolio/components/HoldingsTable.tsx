"use client";

import { useState } from "react";
import { Pencil, Trash2, PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import type { HoldingDetail } from "@/store/api/portfolioApi";
import { EditHoldingDialog } from "./EditHoldingDialog";
import { DeleteHoldingDialog } from "./DeleteHoldingDialog";

function formatINR(v: number) {
  return v.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

interface HoldingsTableProps {
  holdings: HoldingDetail[];
  portfolioId: string;
}

export function HoldingsTable({ holdings, portfolioId }: HoldingsTableProps) {
  const [editHolding, setEditHolding] = useState<HoldingDetail | null>(null);
  const [deleteHolding, setDeleteHolding] = useState<HoldingDetail | null>(null);

  if (holdings.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-2xl bg-muted/50 p-4">
            <PieChart className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <p className="mt-4 text-base font-medium">No holdings yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first holding using the form above
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50 bg-card/80 overflow-hidden">
        <CardHeader className="pb-0 pt-5 px-5">
          <CardTitle className="text-base font-semibold">
            Holdings ({holdings.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-3">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="pl-5">Instrument</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Avg Price</TableHead>
                <TableHead className="text-right">LTP</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead className="text-right pr-5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map((h) => {
                const isPnlPositive = (h.pnl ?? 0) >= 0;
                return (
                  <TableRow key={h.id} className="border-border/30">
                    <TableCell className="pl-5">
                      <p className="font-medium">{h.symbol ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                        {h.name ?? ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {h.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ₹{formatINR(h.average_price)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {h.current_price
                        ? `₹${formatINR(h.current_price)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {h.market_value
                        ? `₹${formatINR(h.market_value)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {h.pnl !== null && h.pnl !== undefined ? (
                        <div>
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              isPnlPositive
                                ? "text-emerald-500"
                                : "text-red-500"
                            }`}
                          >
                            {isPnlPositive ? "+" : ""}₹
                            {formatINR(Math.abs(h.pnl))}
                          </span>
                          <p
                            className={`text-[10px] tabular-nums ${
                              isPnlPositive
                                ? "text-emerald-500/80"
                                : "text-red-500/80"
                            }`}
                          >
                            ({isPnlPositive ? "+" : ""}
                            {h.pnl_percent}%)
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7 text-muted-foreground hover:text-primary-ink"
                          onClick={() => setEditHolding(h)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500"
                          onClick={() => setDeleteHolding(h)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editHolding && (
        <EditHoldingDialog
          holding={editHolding}
          portfolioId={portfolioId}
          onClose={() => setEditHolding(null)}
        />
      )}

      {deleteHolding && (
        <DeleteHoldingDialog
          holding={deleteHolding}
          portfolioId={portfolioId}
          onClose={() => setDeleteHolding(null)}
        />
      )}
    </>
  );
}
