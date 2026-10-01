"use client";

import { Settings as SettingsIcon, User, Shield, Bell, Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const settingsCards = [
  { icon: User, title: "Profile", desc: "Update personal information, email, and phone" },
  { icon: Shield, title: "Security", desc: "Change password, manage sessions, and 2FA" },
  { icon: Bell, title: "Notifications", desc: "Configure alert channels and preferences" },
  { icon: Palette, title: "Appearance", desc: "Theme, chart preferences, display settings" },
  { icon: SettingsIcon, title: "API Keys", desc: "Manage data provider keys and integrations" },
  { icon: Shield, title: "Privacy", desc: "Data export, consent management, account deletion" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {settingsCards.map((item) => (
          <Card key={item.title} className="cursor-pointer border-border/50 bg-card/80 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <item.icon className="h-4 w-4 text-primary-ink" />
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
