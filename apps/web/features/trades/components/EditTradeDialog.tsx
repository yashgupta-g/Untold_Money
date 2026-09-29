"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateTradeMutation, type TradeDetail } from "@/store/api/portfolioApi";

interface EditTradeDialogProps {
  trade: TradeDetail;
  onClose: () => void;
}

export function EditTradeDialog({ trade, onClose }: EditTradeDialogProps) {
  const [updateTrade, { isLoading }] = useUpdateTradeMutation();
  const [exitPrice, setExitPrice] = useState(trade.exit_price?.toString() ?? "");
  const [stopLoss, setStopLoss] = useState(trade.stop_loss?.toString() ?? "");
  const [targetPrice, setTargetPrice] = useState(trade.target_price?.toString() ?? "");
  const [fees, setFees] = useState(trade.fees.toString());
  const [tradeStatus, setTradeStatus] = useState(trade.trade_status);
  const [strategyTag, setStrategyTag] = useState(trade.strategy_tag ?? "");
  const [mistakeTag, setMistakeTag] = useState(trade.mistake_tag ?? "");
  const [emotionTag, setEmotionTag] = useState(trade.emotion_tag ?? "");
  const [notes, setNotes] = useState(trade.notes ?? "");

  const handleSave = async () => {
    try {
      const body: Record<string, unknown> = {};

      if (exitPrice) body.exit_price = parseFloat(exitPrice);
      if (stopLoss) body.stop_loss = parseFloat(stopLoss);
      if (targetPrice) body.target_price = parseFloat(targetPrice);
      if (fees !== trade.fees.toString()) body.fees = parseFloat(fees || "0");
      if (tradeStatus !== trade.trade_status) body.trade_status = tradeStatus;
      if (strategyTag !== (trade.strategy_tag ?? "")) body.strategy_tag = strategyTag || null;
      if (mistakeTag !== (trade.mistake_tag ?? "")) body.mistake_tag = mistakeTag || null;
      if (emotionTag !== (trade.emotion_tag ?? "")) body.emotion_tag = emotionTag || null;
      if (notes !== (trade.notes ?? "")) body.notes = notes || null;

      await updateTrade({ id: trade.id, body }).unwrap();
      onClose();
    } catch {}
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Trade</DialogTitle>
          <DialogDescription>
            Update{" "}
            <span className="font-semibold text-foreground">
              {trade.symbol ?? "trade"}
            </span>{" "}
            — {trade.trade_side} {trade.quantity} @ ₹{trade.entry_price}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <div className="flex rounded-lg border border-border/50 p-0.5">
              {(["OPEN", "CLOSED"] as const).map((s) => (
                <button key={s} onClick={() => setTradeStatus(s)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                    tradeStatus === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Prices row */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Exit Price (₹)</Label>
              <Input type="number" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)}
                placeholder="—" className="bg-muted/50 h-9" min="0" step="any" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Stop Loss (₹)</Label>
              <Input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
                placeholder="—" className="bg-muted/50 h-9" min="0" step="any" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Target (₹)</Label>
              <Input type="number" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="—" className="bg-muted/50 h-9" min="0" step="any" />
            </div>
          </div>

          {/* Fees */}
          <div className="space-y-1.5">
            <Label className="text-xs">Fees (₹)</Label>
            <Input type="number" value={fees} onChange={(e) => setFees(e.target.value)}
              className="bg-muted/50 h-9" min="0" step="any" />
          </div>

          {/* Tags row */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Strategy Tag</Label>
              <Input value={strategyTag} onChange={(e) => setStrategyTag(e.target.value)}
                placeholder="e.g., Breakout" className="bg-muted/50 h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Emotion</Label>
              <Input value={emotionTag} onChange={(e) => setEmotionTag(e.target.value)}
                placeholder="e.g., Confident" className="bg-muted/50 h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mistake Tag</Label>
              <Input value={mistakeTag} onChange={(e) => setMistakeTag(e.target.value)}
                placeholder="e.g., Early Exit" className="bg-muted/50 h-9" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Trade observations..."
              className="w-full rounded-md border border-border/50 bg-muted/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30 resize-none"
              rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
