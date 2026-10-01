"use client";

import { CircleNotch, Warning } from "@phosphor-icons/react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRemoveHoldingMutation, type HoldingDetail } from "@/store/api/portfolioApi";

interface DeleteHoldingDialogProps {
  holding: HoldingDetail;
  portfolioId: string;
  onClose: () => void;
}

export function DeleteHoldingDialog({ holding, portfolioId, onClose }: DeleteHoldingDialogProps) {
  const [removeHolding, { isLoading }] = useRemoveHoldingMutation();

  const handleDelete = async () => {
    try {
      await removeHolding({ portfolioId, holdingId: holding.id }).unwrap();
      onClose();
    } catch {}
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mb-2">
            <Warning className="h-6 w-6 text-red-500" />
          </div>
          <DialogTitle className="text-center">Remove Holding</DialogTitle>
          <DialogDescription className="text-center">
            Are you sure you want to remove{" "}
            <span className="font-semibold text-foreground">
              {holding.symbol ?? "this holding"}
            </span>{" "}
            from your portfolio? This action cannot be undone.
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
              "Remove"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
