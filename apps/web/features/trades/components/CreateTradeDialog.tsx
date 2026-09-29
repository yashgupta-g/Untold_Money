"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  useCreateTradeMutation,
  useGetPortfoliosQuery,
} from "@/store/api/portfolioApi";
import {
  useSearchInstrumentsQuery,
  type InstrumentDetail,
} from "@/store/api/marketApi";

interface CreateTradeDialogProps {
  open: boolean;
  onClose: () => void;
}

const STRATEGY_SUGGESTIONS = [
  "Breakout", "Momentum", "Mean Reversion", "Trend Following",
  "Scalping", "Swing", "Gap Fill", "VWAP",
];

const EMOTION_OPTIONS = ["Confident", "Fearful", "Greedy", "Neutral", "FOMO", "Revenge"];

export function CreateTradeDialog({ open, onClose }: CreateTradeDialogProps) {
  const [createTrade, { isLoading }] = useCreateTradeMutation();
  const { data: portfoliosRes } = useGetPortfoliosQuery();
  const portfolios = portfoliosRes?.data ?? [];

  // Form state
  const [portfolioId, setPortfolioId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentDetail | null>(null);
  const [tradeSide, setTradeSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [fees, setFees] = useState("0");
  const [tradeStatus, setTradeStatus] = useState<"OPEN" | "CLOSED">("OPEN");
  const [strategyTag, setStrategyTag] = useState("");
  const [mistakeTag, setMistakeTag] = useState("");
  const [emotionTag, setEmotionTag] = useState("");
  const [notes, setNotes] = useState("");
  const [tradeTime, setTradeTime] = useState(
    new Date().toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM
  );
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: searchRes, isFetching: searchFetching } = useSearchInstrumentsQuery(
    { q: searchQuery, limit: 8 },
    { skip: searchQuery.length < 2 }
  );
  const instruments = searchRes?.data ?? [];

  // Set default portfolio
  useEffect(() => {
    if (portfolios.length > 0 && !portfolioId) {
      setPortfolioId(portfolios[0].id);
    }
  }, [portfolios, portfolioId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const resetForm = () => {
    setSearchQuery("");
    setSelectedInstrument(null);
    setTradeSide("BUY");
    setQuantity("");
    setEntryPrice("");
    setExitPrice("");
    setStopLoss("");
    setTargetPrice("");
    setFees("0");
    setTradeStatus("OPEN");
    setStrategyTag("");
    setMistakeTag("");
    setEmotionTag("");
    setNotes("");
    setTradeTime(new Date().toISOString().slice(0, 16));
  };

  const handleSubmit = async () => {
    if (!selectedInstrument || !portfolioId || !quantity || !entryPrice) return;

    try {
      await createTrade({
        portfolio_id: portfolioId,
        instrument_id: selectedInstrument.id,
        trade_side: tradeSide,
        quantity: parseFloat(quantity),
        entry_price: parseFloat(entryPrice),
        exit_price: exitPrice ? parseFloat(exitPrice) : null,
        stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        target_price: targetPrice ? parseFloat(targetPrice) : null,
        fees: parseFloat(fees || "0"),
        trade_status: tradeStatus,
        strategy_tag: strategyTag || null,
        mistake_tag: mistakeTag || null,
        emotion_tag: emotionTag || null,
        notes: notes || null,
        trade_time: new Date(tradeTime).toISOString(),
      }).unwrap();
      resetForm();
      onClose();
    } catch {}
  };

  const handleSelect = (inst: InstrumentDetail) => {
    setSelectedInstrument(inst);
    setSearchQuery(inst.symbol);
    setShowSearchResults(false);
  };

  if (!open) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log New Trade</DialogTitle>
          <DialogDescription>
            Record a trade entry for your journal
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Row 1: Portfolio + Instrument */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Portfolio</Label>
              <select
                value={portfolioId}
                onChange={(e) => setPortfolioId(e.target.value)}
                className="h-9 w-full rounded-md border border-border/50 bg-muted/50 px-3 text-sm outline-none focus:ring-1 focus:ring-primary/30"
              >
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 relative" ref={searchRef}>
              <Label className="text-xs">Instrument</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search symbol..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedInstrument(null);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                  className="bg-muted/50 pl-9 pr-8 h-9"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setSelectedInstrument(null); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {showSearchResults && searchQuery.length >= 2 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto rounded-lg border border-border/60 bg-popover shadow-xl">
                  {searchFetching ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  ) : instruments.length === 0 ? (
                    <p className="py-3 text-center text-xs text-muted-foreground">No results</p>
                  ) : (
                    instruments.map((inst) => (
                      <button key={inst.id} onClick={() => handleSelect(inst)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors">
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                          {inst.symbol.slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{inst.symbol}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{inst.name}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
              {selectedInstrument && (
                <p className="text-[10px] text-emerald-500 font-medium mt-0.5">
                  ✓ {selectedInstrument.name}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Side + Status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Side</Label>
              <div className="flex rounded-lg border border-border/50 p-0.5">
                {(["BUY", "SELL"] as const).map((s) => (
                  <button key={s} onClick={() => setTradeSide(s)}
                    className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                      tradeSide === s
                        ? s === "BUY" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                        : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
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
          </div>

          {/* Row 3: Qty, Entry, Exit, Time */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Quantity</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                placeholder="100" className="bg-muted/50 h-9" min="0" step="any" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Entry Price (₹)</Label>
              <Input type="number" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="1500" className="bg-muted/50 h-9" min="0" step="any" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Exit Price (₹)</Label>
              <Input type="number" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)}
                placeholder="Optional" className="bg-muted/50 h-9" min="0" step="any" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Trade Time</Label>
              <Input type="datetime-local" value={tradeTime} onChange={(e) => setTradeTime(e.target.value)}
                className="bg-muted/50 h-9 text-xs" />
            </div>
          </div>

          {/* Row 4: SL, Target, Fees */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Stop Loss (₹)</Label>
              <Input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Optional" className="bg-muted/50 h-9" min="0" step="any" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Target Price (₹)</Label>
              <Input type="number" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Optional" className="bg-muted/50 h-9" min="0" step="any" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fees (₹)</Label>
              <Input type="number" value={fees} onChange={(e) => setFees(e.target.value)}
                placeholder="0" className="bg-muted/50 h-9" min="0" step="any" />
            </div>
          </div>

          {/* Row 5: Strategy + Emotion + Mistake */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Strategy Tag</Label>
              <Input value={strategyTag} onChange={(e) => setStrategyTag(e.target.value)}
                placeholder="e.g., Breakout" className="bg-muted/50 h-9" list="strategy-suggestions" />
              <datalist id="strategy-suggestions">
                {STRATEGY_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Emotion</Label>
              <select value={emotionTag} onChange={(e) => setEmotionTag(e.target.value)}
                className="h-9 w-full rounded-md border border-border/50 bg-muted/50 px-3 text-sm outline-none focus:ring-1 focus:ring-primary/30">
                <option value="">Select...</option>
                {EMOTION_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
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
              placeholder="Trade rationale, observations..."
              className="w-full rounded-md border border-border/50 bg-muted/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30 resize-none"
              rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="gap-2" onClick={handleSubmit}
            disabled={isLoading || !selectedInstrument || !quantity || !entryPrice || !portfolioId}>
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Log Trade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
