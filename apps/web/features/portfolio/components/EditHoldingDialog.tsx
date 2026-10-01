"use client";

import { useState } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateHoldingMutation, type HoldingDetail } from "@/store/api/portfolioApi";

interface EditHoldingDialogProps {
  holding: HoldingDetail;
  portfolioId: string;
  onClose: () => void;
}

export function EditHoldingDialog({ holding, portfolioId, onClose }: EditHoldingDialogProps) {
  const [updateHolding, { isLoading }] = useUpdateHoldingMutation();
  const [quantity, setQuantity] = useState(String(holding.quantity));
  const [avgPrice, setAvgPrice] = useState(String(holding.average_price));

  const handleSave = async () => {
    try {
      await updateHolding({
        portfolioId,
        holdingId: holding.id,
        quantity: parseFloat(quantity),
        average_price: parseFloat(avgPrice),
      }).unwrap();
      onClose();
    } catch {}
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Holding</DialogTitle>
          <DialogDescription>
            Update quantity and average price for{" "}
            <span className="font-semibold text-foreground">
              {holding.symbol ?? "this holding"}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-qty" className="text-xs">Quantity</Label>
            <Input
              id="edit-qty"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-muted/50"
              min="0"
              step="any"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-price" className="text-xs">Average Price (₹)</Label>
            <Input
              id="edit-price"
              type="number"
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
              className="bg-muted/50"
              min="0"
              step="any"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLoading || !quantity || !avgPrice}
          >
            {isLoading ? <CircleNotch className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
