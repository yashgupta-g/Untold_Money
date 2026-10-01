"use client";

import { CircleNotch, Warning } from "@phosphor-icons/react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteTradeMutation, type TradeDetail } from "@/store/api/portfolioApi";

interface DeleteTradeDialogProps {
  trade: TradeDetail;
  onClose: () => void;
}

export function DeleteTradeDialog({ trade, onClose }: DeleteTradeDialogProps) {
  const [deleteTrade, { isLoading }] = useDeleteTradeMutation();

  const handleDelete = async () => {
    try {
      await deleteTrade(trade.id).unwrap();
      onClose();
    } catch {}
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mb-2">
            <Warning className="h-6 w-6 text-red-500" />
          </div>
          <DialogTitle className="text-center">Delete Trade</DialogTitle>
          <DialogDescription className="text-center">
            Are you sure you want to delete the{" "}
            <span className="font-semibold text-foreground">
              {trade.trade_side} {trade.symbol ?? "trade"}
            </span>{" "}
            entry? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? (
              <CircleNotch className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
