"use client";

import { useState } from "react";
import { Pencil, Trash2, ArrowLeftRight, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import type { TradeDetail } from "@/store/api/portfolioApi";
import { EditTradeDialog } from "./EditTradeDialog";
import { DeleteTradeDialog } from "./DeleteTradeDialog";

function formatINR(v: number) {
  return Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

interface TradesTableProps {
  trades: TradeDetail[];
  isLoading?: boolean;
}

export function TradesTable({ trades, isLoading }: TradesTableProps) {
  const [editTrade, setEditTrade] = useState<TradeDetail | null>(null);
  const [deleteTrade, setDeleteTrade] = useState<TradeDetail | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="mt-4 text-sm text-muted-foreground">Loading trades...</p>
        </CardContent>
      </Card>
    );
  }

  if (trades.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="rounded-2xl bg-muted/50 p-4">
            <ArrowLeftRight className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <p className="mt-4 text-base font-medium">No trades found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Log your first trade to start tracking performance
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
            Trade Log ({trades.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-3">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="pl-5 w-8"></TableHead>
                <TableHead>Instrument</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Entry</TableHead>
                <TableHead className="text-right">Exit</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right pr-5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => {
                const isPnlPositive = (trade.pnl ?? 0) >= 0;
                const isExpanded = expandedId === trade.id;

                return (
                  <>
                    <TableRow
                      key={trade.id}
                      className="border-border/30 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : trade.id)}
                    >
                      <TableCell className="pl-5 w-8">
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{trade.symbol ?? "—"}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {trade.name ?? ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            trade.trade_side === "BUY"
                              ? "border-emerald-500/30 text-emerald-500"
                              : "border-red-500/30 text-red-500"
                          }`}
                        >
                          {trade.trade_side}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {trade.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ₹{formatINR(trade.entry_price)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {trade.exit_price ? `₹${formatINR(trade.exit_price)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {trade.pnl !== null && trade.pnl !== undefined ? (
                          <div>
                            <span
                              className={`text-sm font-semibold tabular-nums ${
                                isPnlPositive ? "text-emerald-500" : "text-red-500"
                              }`}
                            >
                              {isPnlPositive ? "+" : "-"}₹{formatINR(trade.pnl)}
                            </span>
                            {trade.pnl_percent !== null && (
                              <p
                                className={`text-[10px] tabular-nums ${
                                  isPnlPositive ? "text-emerald-500/80" : "text-red-500/80"
                                }`}
                              >
                                ({isPnlPositive ? "+" : ""}{trade.pnl_percent}%)
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${
                            trade.trade_status === "OPEN"
                              ? "bg-primary/10 text-primary-ink"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {trade.trade_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(trade.trade_time)}
                      </TableCell>
                      <TableCell className="text-right pr-5">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7 text-muted-foreground hover:text-primary-ink"
                            onClick={() => setEditTrade(trade)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7 text-muted-foreground hover:text-red-500"
                            onClick={() => setDeleteTrade(trade)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row — Tags & Notes */}
                    {isExpanded && (
                      <TableRow key={`${trade.id}-details`} className="border-border/20 bg-muted/20">
                        <TableCell colSpan={10} className="px-5 py-3">
                          <div className="flex flex-wrap gap-4 text-xs">
                            {trade.strategy_tag && (
                              <div>
                                <span className="text-muted-foreground">Strategy: </span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {trade.strategy_tag}
                                </Badge>
                              </div>
                            )}
                            {trade.mistake_tag && (
                              <div>
                                <span className="text-muted-foreground">Mistake: </span>
                                <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600">
                                  {trade.mistake_tag}
                                </Badge>
                              </div>
                            )}
                            {trade.emotion_tag && (
                              <div>
                                <span className="text-muted-foreground">Emotion: </span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {trade.emotion_tag}
                                </Badge>
                              </div>
                            )}
                            {trade.stop_loss && (
                              <div>
                                <span className="text-muted-foreground">SL: </span>
                                <span className="tabular-nums">₹{formatINR(trade.stop_loss)}</span>
                              </div>
                            )}
                            {trade.target_price && (
                              <div>
                                <span className="text-muted-foreground">Target: </span>
                                <span className="tabular-nums">₹{formatINR(trade.target_price)}</span>
                              </div>
                            )}
                            {trade.fees > 0 && (
                              <div>
                                <span className="text-muted-foreground">Fees: </span>
                                <span className="tabular-nums">₹{formatINR(trade.fees)}</span>
                              </div>
                            )}
                          </div>
                          {trade.notes && (
                            <p className="mt-2 text-xs text-muted-foreground italic">
                              &ldquo;{trade.notes}&rdquo;
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editTrade && (
        <EditTradeDialog trade={editTrade} onClose={() => setEditTrade(null)} />
      )}
      {deleteTrade && (
        <DeleteTradeDialog trade={deleteTrade} onClose={() => setDeleteTrade(null)} />
      )}
    </>
  );
}
