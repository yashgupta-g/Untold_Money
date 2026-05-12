"use client";

import { Shield, Users, Activity, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">System monitoring and management</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Users, title: "Total Users", value: "1,247", sub: "+12 today" },
          { icon: Activity, title: "API Requests", value: "45.2K", sub: "Last 24h" },
          { icon: Database, title: "DB Size", value: "2.4 GB", sub: "PostgreSQL" },
          { icon: Shield, title: "Audit Events", value: "8,920", sub: "This week" },
        ].map((s) => (
          <Card key={s.title} className="border-border/50 bg-card/80">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.title}</p>
                  <p className="mt-1 text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Recent Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { action: "user.registered", user: "new_user@test.com", time: "2 min ago" },
              { action: "user.logged_in", user: "yash@example.com", time: "15 min ago" },
              { action: "user.logged_out", user: "trader@test.com", time: "1 hour ago" },
              { action: "user.login_failed", user: "unknown@test.com", time: "2 hours ago" },
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] font-mono">{log.action}</Badge>
                  <span className="text-sm">{log.user}</span>
                </div>
                <span className="text-xs text-muted-foreground">{log.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
