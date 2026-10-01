"use client";

import { Bell, Plus, Check, X, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockAlerts = [
  { id: 1, symbol: "RELIANCE", type: "Price Above", value: "₹2,500", status: "active", created: "2 hours ago" },
  { id: 2, symbol: "TATAMOTORS", type: "RSI Above", value: "70", status: "triggered", created: "1 day ago" },
  { id: 3, symbol: "HDFCBANK", type: "Price Below", value: "₹1,550", status: "active", created: "3 days ago" },
  { id: 4, symbol: "INFY", type: "Volume Spike", value: "2x Avg", status: "active", created: "5 days ago" },
  { id: 5, symbol: "TCS", type: "SMA Cross", value: "20/50", status: "expired", created: "1 week ago" },
];

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground">Set price and indicator alerts for your watchlist</p>
        </div>
        <Button size="sm" className="gap-1.5" id="create-alert-btn">
          <Plus className="h-4 w-4" />
          New Alert
        </Button>
      </div>

      <div className="space-y-3">
        {mockAlerts.map((alert) => (
          <Card key={alert.id} className="border-border/50 bg-card/80 transition-all hover:border-border">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-2 ${alert.status === "triggered" ? "bg-chart-2/10" : alert.status === "expired" ? "bg-muted" : "bg-primary/10"}`}>
                  <Bell className={`h-4 w-4 ${alert.status === "triggered" ? "text-chart-2" : alert.status === "expired" ? "text-muted-foreground" : "text-primary-ink"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{alert.symbol}</span>
                    <Badge variant="outline" className="text-[10px]">{alert.type}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Target: {alert.value} · Created {alert.created}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${
                    alert.status === "active" ? "bg-primary/10 text-primary-ink" :
                    alert.status === "triggered" ? "bg-chart-2/10 text-chart-2" :
                    "bg-muted text-muted-foreground"
                  }`}
                >
                  {alert.status === "active" && <Clock className="mr-1 h-3 w-3" />}
                  {alert.status === "triggered" && <Check className="mr-1 h-3 w-3" />}
                  {alert.status === "expired" && <X className="mr-1 h-3 w-3" />}
                  {alert.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
