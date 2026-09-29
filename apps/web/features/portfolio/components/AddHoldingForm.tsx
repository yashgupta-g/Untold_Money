"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Loader2, Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddHoldingMutation } from "@/store/api/portfolioApi";
import { useSearchInstrumentsQuery, type InstrumentDetail } from "@/store/api/marketApi";

interface AddHoldingFormProps {
  portfolioId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AddHoldingForm({ portfolioId, isOpen, onClose }: AddHoldingFormProps) {
  const [addHolding, { isLoading }] = useAddHoldingMutation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentDetail | null>(null);
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: searchRes, isFetching } = useSearchInstrumentsQuery(
    { q: searchQuery, limit: 8 },
    { skip: searchQuery.length < 2 }
  );
  const instruments = searchRes?.data ?? [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (inst: InstrumentDetail) => {
    setSelectedInstrument(inst);
    setSearchQuery(inst.symbol);
    setShowResults(false);
  };

  const handleSubmit = async () => {
    if (!selectedInstrument || !quantity || !avgPrice) return;
    try {
      await addHolding({
        portfolioId,
        instrument_id: selectedInstrument.id,
        quantity: parseFloat(quantity),
        average_price: parseFloat(avgPrice),
      }).unwrap();
      // Reset
      setSelectedInstrument(null);
      setSearchQuery("");
      setQuantity("");
      setAvgPrice("");
      onClose();
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <Card className="border-primary/20 bg-card/90 backdrop-blur-sm animate-in slide-in-from-top-2 duration-300">
      <CardContent className="p-5">
        <div className="grid gap-4 sm:grid-cols-4">
          {/* Instrument Search */}
          <div className="sm:col-span-2 relative" ref={searchRef}>
            <Label htmlFor="instrument-search" className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Search Instrument
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="instrument-search"
                placeholder="e.g., RELIANCE, TCS..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedInstrument(null);
                  setShowResults(true);
                }}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                className="bg-muted/50 pl-9 pr-8"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedInstrument(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown */}
            {showResults && searchQuery.length >= 2 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-border/60 bg-popover shadow-xl">
                {isFetching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                ) : instruments.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No instruments found
                  </p>
                ) : (
                  instruments.map((inst) => (
                    <button
                      key={inst.id}
                      onClick={() => handleSelect(inst)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                        {inst.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{inst.symbol}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {inst.name}
                        </p>
                      </div>
                      {inst.sector && (
                        <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                          {inst.sector}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedInstrument && (
              <p className="mt-1 text-[10px] text-emerald-500 font-medium">
                ✓ {selectedInstrument.name}
              </p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <Label htmlFor="holding-qty" className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Quantity
            </Label>
            <Input
              id="holding-qty"
              type="number"
              placeholder="100"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-muted/50"
              min="0"
              step="any"
            />
          </div>

          {/* Average Price */}
          <div>
            <Label htmlFor="holding-price" className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Avg Price (₹)
            </Label>
            <Input
              id="holding-price"
              type="number"
              placeholder="1500.00"
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
              className="bg-muted/50"
              min="0"
              step="any"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={handleSubmit}
            disabled={isLoading || !selectedInstrument || !quantity || !avgPrice}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add Holding
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
