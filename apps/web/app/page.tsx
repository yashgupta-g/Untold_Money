"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, PieChart, Shield, ArrowRight, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Background gradient effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -right-40 top-1/3 h-[600px] w-[600px] rounded-full bg-chart-5/5 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-chart-2/5 blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Untold<span className="text-primary">Money</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-sm" id="nav-login-btn">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button className="text-sm" id="nav-register-btn">
              Get Started
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          AI-Powered Analytics Platform
        </div>

        <h1 className="max-w-4xl text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
          Master Your{" "}
          <span className="bg-gradient-to-r from-primary via-chart-5 to-chart-2 bg-clip-text text-transparent">
            Trading Journey
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Advanced stock analytics, intelligent portfolio management, and trade journaling —
          powered by AI to help you make informed decisions.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="h-12 px-8 text-base glow-effect" id="hero-cta-btn">
              Start Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" id="hero-login-btn">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Feature cards */}
        <div className="mt-24 grid w-full max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: BarChart3,
              title: "Stock Analytics",
              description: "Technical indicators, AI explanations, and pattern recognition",
            },
            {
              icon: PieChart,
              title: "Portfolio Tracker",
              description: "Real-time portfolio valuation with risk and exposure analysis",
            },
            {
              icon: TrendingUp,
              title: "Trade Journal",
              description: "Log trades with strategy tags, emotions, and performance analytics",
            },
            {
              icon: Shield,
              title: "Risk Insights",
              description: "Position sizing, drawdown alerts, and risk-adjusted metrics",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="mt-16 mb-8 max-w-lg text-center text-xs text-muted-foreground/60">
          UntoldMoney is an analytics and decision-support platform. It does not provide
          financial advice, guaranteed predictions, or buy/sell signals.
        </p>
      </main>
    </div>
  );
}
