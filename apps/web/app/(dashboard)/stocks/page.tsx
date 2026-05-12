"use client";

import { Search, Filter, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const mockStocks = [
  { symbol: "RELIANCE", name: "Reliance Industries", price: 2480.5, change: 1.25, sector: "Oil & Gas", volume: "12.5M" },
  { symbol: "TCS", name: "Tata Consultancy Services", price: 3650.0, change: -0.85, sector: "IT", volume: "4.2M" },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 1580.0, change: 0.45, sector: "Banking", volume: "8.1M" },
  { symbol: "INFY", name: "Infosys", price: 1420.75, change: 2.1, sector: "IT", volume: "6.8M" },
  { symbol: "ICICIBANK", name: "ICICI Bank", price: 1050.25, change: -1.3, sector: "Banking", volume: "9.3M" },
  { symbol: "TATAMOTORS", name: "Tata Motors", price: 685.4, change: 4.21, sector: "Auto", volume: "15.2M" },
  { symbol: "WIPRO", name: "Wipro", price: 445.0, change: -0.55, sector: "IT", volume: "3.6M" },
  { symbol: "SBIN", name: "State Bank of India", price: 625.8, change: 1.92, sector: "Banking", volume: "11.4M" },
  { symbol: "ADANIENT", name: "Adani Enterprises", price: 2450.0, change: 3.85, sector: "Conglomerate", volume: "7.9M" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 6780.25, change: -2.14, sector: "NBFC", volume: "2.8M" },
  { symbol: "LT", name: "Larsen & Toubro", price: 3280.5, change: 0.95, sector: "Capital Goods", volume: "3.1M" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", price: 1120.5, change: -1.05, sector: "Pharma", volume: "5.4M" },
];

export default function StocksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stocks</h1>
          <p className="text-sm text-muted-foreground">
            Browse and analyze stocks across Indian exchanges
          </p>
        </div>
        <Badge variant="secondary" className="text-xs font-mono">
          NSE · {mockStocks.length} instruments
        </Badge>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by symbol, name, or sector..."
            className="bg-muted/50 pl-9 border-none"
            id="stock-search"
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/80 px-4 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Stock Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mockStocks.map((stock) => (
          <Link key={stock.symbol} href={`/stocks/${stock.symbol}`}>
            <Card className="group cursor-pointer border-border/50 bg-card/80 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold">{stock.symbol}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {stock.name}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      stock.change >= 0
                        ? "border-chart-2/30 text-chart-2"
                        : "border-destructive/30 text-destructive"
                    }`}
                  >
                    {stock.change >= 0 ? "+" : ""}
                    {stock.change}%
                  </Badge>
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-lg font-bold">₹{stock.price.toLocaleString()}</p>
                    <div className="mt-1 flex items-center gap-1">
                      {stock.change >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-chart-2" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        Vol: {stock.volume}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {stock.sector}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
