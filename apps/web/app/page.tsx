import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { ArrowUpRight, Ban, Database, Info, Sparkles, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { HeroStage } from "@/features/landing/components/HeroStage";
import {
  HOLDINGS,
  JournalScreen,
  PhoneFrame,
  PortfolioScreen,
} from "@/features/landing/components/PhoneMockups";
import styles from "@/features/landing/landing.module.css";

const inter = Inter({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "UntoldMoney — Stock analysis, portfolio and trade review",
  description:
    "Indicators, a composite score and a validated ML model for every NSE stock, alongside your holdings and journaled trades.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#f7f9f8",
};

const NAV_LINKS = [
  { href: "#portfolio", label: "Portfolio" },
  { href: "#journal", label: "Journal" },
  { href: "#analysis", label: "Analysis" },
  { href: "#method", label: "Method" },
  { href: "#limits", label: "Data & limits" },
];

const CONCENTRATION_THRESHOLD = 30;
const TALLEST_HOLDING = Math.max(...HOLDINGS.map((h) => h.pct));

const TAG_GROUPS = [
  { name: "Strategy", tags: ["Breakout", "Pullback", "Mean reversion"] },
  { name: "Mistake", tags: ["Early exit", "Oversized", "Chased entry"], highlight: "Early exit" },
  { name: "Emotion", tags: ["Confident", "Fearful", "FOMO"] },
];

const JOURNAL_METRICS = [
  { name: "Win rate", body: "Share of closed trades that made money." },
  { name: "Profit factor", body: "Gross profit divided by gross loss." },
  { name: "Expectancy", body: "Average profit or loss per trade." },
];

const bullish = <span className={styles.bullish}>Bullish</span>;
const bearish = <span className={styles.bearish}>Bearish</span>;

const INDICATORS: { name: string; rule: ReactNode; candles: string }[] = [
  { name: "SMA 20 / 50", rule: <>{bullish} if close above</>, candles: "20 / 50" },
  { name: "EMA 20", rule: <>{bullish} if close above</>, candles: "20" },
  { name: "RSI 14", rule: <>{bearish} &gt;70 · {bullish} &lt;30</>, candles: "15" },
  { name: "MACD + signal", rule: <>{bullish} if MACD &gt; 0</>, candles: "35" },
  { name: "ATR 14", rule: "Volatility only", candles: "15" },
];

const SCORE_WEIGHTS = [
  { label: "Trend", weight: "30%" },
  { label: "Momentum", weight: "30%" },
  { label: "Volatility", weight: "20%" },
  { label: "Volume", weight: "20%" },
];

const MODEL_SPECS = [
  { label: "Model", value: "Gradient boosting" },
  { label: "Horizon", value: "3-day direction · 5-day range" },
  { label: "Minimum data", value: "80 daily candles" },
];

const STEPS = [
  {
    title: "Features from candles",
    body: "Returns, moving averages, RSI, MACD, volatility and volume.",
  },
  {
    title: "Time-ordered split",
    body: "Train on the earlier 80% of history, test on the latest 20%. No look-ahead.",
  },
  {
    title: "Accuracy on display",
    body: "Validation accuracy and top signals appear beside every call.",
  },
  {
    title: "Declines on thin data",
    body: "Under 80 candles returns no prediction rather than a weak one.",
  },
];

const LIMITS = [
  {
    Icon: Database,
    title: "Market data comes from Yahoo Finance",
    body: "It can be delayed or missing for a symbol. When it is, the app says so instead of estimating.",
  },
  {
    Icon: Sparkles,
    title: "Predictions are statistical",
    body: "They describe historical patterns and carry no guarantee.",
  },
  {
    Icon: Ban,
    title: "No trading",
    body: "UntoldMoney does not connect to brokers or execute orders.",
  },
];

export default function HomePage() {
  return (
    <div className={cn(inter.variable, styles.page)}>
      <header className={styles.header}>
        <div className={cn(styles.container, styles.nav)}>
          <Logo />
          <nav className={styles.navLinks} aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className={styles.navActions}>
            <Link className={styles.textLink} href="/login">
              Log in
            </Link>
            <span className={styles.divider} aria-hidden="true" />
            <Link className={cn(styles.btn, styles.btnDark, styles.btnSm)} href="/register">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>
                <span className={styles.eyebrowIcon}>
                  <Sparkles size={13} strokeWidth={2.4} />
                </span>
                NSE stock analytics · no orders, no advice
              </span>
              <h1 className={styles.title}>
                <span className={styles.titleLight}>See what the data says,</span>
                <span className={styles.titleBold}>
                  and how <span className={styles.mark}>you traded.</span>
                </span>
              </h1>
              <p className={styles.lede}>
                Indicators, a composite score and a validated ML model for every NSE stock, with
                your holdings and journaled trades right beside them.
              </p>
              <div className={styles.cta}>
                <GetStarted />
                <a className={styles.btn} href="#analysis">
                  See how it works
                </a>
              </div>
              <ul className={styles.facts}>
                <li>
                  <b className={styles.num}>7</b> technical indicators
                </li>
                <li>
                  <b className={styles.num}>23</b> model features
                </li>
                <li>
                  <b className={styles.num}>80/20</b> time-ordered validation
                </li>
              </ul>
            </div>
            <HeroStage />
          </div>
        </section>

        <section id="portfolio" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.kicker}>Portfolio</div>
            <h2 className={styles.h2}>
              Your holdings,
              <br />
              <em>with the risk visible</em>
            </h2>
            <p className={styles.sub}>
              Portfolios are valued from stored prices, broken down by holding and sector, and
              flagged when one position dominates.
            </p>

            <div className={styles.showcase}>
              <PhoneFrame
                active="portfolio"
                label="App preview with sample data: a portfolio worth ₹12,45,680 across five holdings, with holding A flagged at 34% of value"
              >
                <PortfolioScreen />
              </PhoneFrame>

              <div className={styles.featureCard}>
                <h3>
                  <span>Concentration</span>
                  you can see
                </h3>
                <p>
                  Each portfolio shows invested amount, current value and unrealized P&amp;L. A
                  warning appears when any single holding passes {CONCENTRATION_THRESHOLD}% of
                  portfolio value.
                </p>
                <div className={styles.bars} aria-hidden="true">
                  {HOLDINGS.map((h) => (
                    <div
                      key={h.label}
                      className={h.pct > CONCENTRATION_THRESHOLD ? styles.barHi : undefined}
                    >
                      <span className={styles.num}>{h.pct}%</span>
                      <i style={{ height: `${(h.pct / TALLEST_HOLDING) * 110}px` }} />
                      {h.label}
                    </div>
                  ))}
                </div>
                <div className={styles.threshold}>
                  <TriangleAlert size={15} strokeWidth={2.4} />
                  Holding A is above the {CONCENTRATION_THRESHOLD}% concentration threshold
                </div>
                <div className={styles.featureFoot}>
                  <Link className={styles.roundBtn} href="/register" aria-label="Create an account">
                    <ArrowUpRight size={24} />
                  </Link>
                  <span>
                    <b>Track your own portfolio</b>
                    Sample data shown. Yours is valued the same way.
                  </span>
                </div>
              </div>

              <div className={styles.sideStack}>
                <div className={styles.tileBrand}>
                  <b className={styles.num}>{CONCENTRATION_THRESHOLD}%</b>
                  <p>The share of portfolio value one holding can reach before you&apos;re warned.</p>
                </div>
                <div className={styles.tilePlain}>
                  <h3>
                    Valued from
                    <span>stored prices</span>
                  </h3>
                  <p>Invested amount, current value and unrealized P&amp;L, by holding and by sector.</p>
                  <a className={styles.underlineLink} href="#limits">
                    Where the data comes from
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="journal" className={styles.section}>
          <div className={cn(styles.container, styles.split)}>
            <div>
              <div className={styles.kicker}>Trade journal</div>
              <h2 className={styles.h2}>
                Every trade,
                <br />
                <em>tagged and tallied</em>
              </h2>
              <p className={styles.sub}>
                Tag each trade with its strategy, the mistake and the emotion behind it. The journal
                rolls them into your numbers and shows which mistakes keep repeating.
              </p>
              <dl className={styles.tagGroups}>
                {TAG_GROUPS.map((group) => (
                  <div key={group.name} className={styles.tagGroup}>
                    <dt>{group.name}</dt>
                    {group.tags.map((tag) => (
                      <dd
                        key={tag}
                        className={cn(styles.chip, tag === group.highlight && styles.chipBrand)}
                      >
                        {tag}
                      </dd>
                    ))}
                  </div>
                ))}
              </dl>
              <div className={styles.metrics}>
                {JOURNAL_METRICS.map((metric) => (
                  <div key={metric.name} className={styles.metric}>
                    <b>{metric.name}</b>
                    <span>{metric.body}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.phoneStage}>
              <div className={styles.sticker} aria-hidden="true">
                <span className={styles.stickerIcon}>
                  <TriangleAlert size={16} strokeWidth={2.4} />
                </span>
                <span>
                  <b>Repeated mistake</b>
                  Early exit · 4 times
                </span>
              </div>
              <PhoneFrame
                active="journal"
                label="App preview with sample data: a trade journal with 58% win rate, profit factor 1.6 and tagged trades"
              >
                <JournalScreen />
              </PhoneFrame>
            </div>
          </div>
        </section>

        <section id="analysis" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.center}>
              <div className={styles.kicker}>Analysis</div>
              <h2 className={styles.h2}>
                Built to be <em>read, not trusted blindly</em>
              </h2>
              <p className={styles.sub}>
                Every output lists the values behind it, using rules you can inspect.
              </p>
            </div>
            <div className={styles.bento}>
              <div className={cn(styles.tile, styles.tileIndicators)}>
                <h3>Indicators</h3>
                <p>The exact rules the app applies to daily candles.</p>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Indicator</th>
                      <th>Signal rule</th>
                      <th className={styles.right}>Candles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {INDICATORS.map((indicator) => (
                      <tr key={indicator.name}>
                        <td>{indicator.name}</td>
                        <td>{indicator.rule}</td>
                        <td className={cn(styles.right, styles.num)}>{indicator.candles}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className={styles.tileNote}>
                  <Info size={15} strokeWidth={2.2} />
                  Each indicator reports only once a stock has the number of daily candles shown,
                  so a new listing shows fewer signals instead of guessed ones.
                </p>
              </div>

              <div className={cn(styles.tile, styles.tileScore)}>
                <h3>Stock score</h3>
                <p>One number from four parts, weighted openly.</p>
                <ul>
                  {SCORE_WEIGHTS.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <span className={styles.num}>{item.weight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={cn(styles.tile, styles.tileModel)}>
                <h3>ML direction</h3>
                <p>UP or DOWN with confidence, shown next to its validation accuracy.</p>
                <ul>
                  {MODEL_SPECS.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <span>{item.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="method" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.kicker}>Method</div>
            <h2 className={styles.h2}>
              How predictions <em>are validated</em>
            </h2>
            <div className={styles.steps}>
              {STEPS.map((step, i) => (
                <div key={step.title} className={styles.step}>
                  <div className={styles.stepNum}>{String(i + 1).padStart(2, "0")}</div>
                  <b>{step.title}</b>
                  <span>{step.body}</span>
                </div>
              ))}
            </div>
            <div id="limits" className={styles.limits}>
              <h3>Data and limits</h3>
              <ul className={styles.limitList}>
                {LIMITS.map(({ Icon, title, body }) => (
                  <li key={title}>
                    <span className={styles.limitIcon}>
                      <Icon size={17} strokeWidth={2} />
                    </span>
                    <b>{title}</b>
                    {body}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.final}>
          <div className={styles.container}>
            <div className={styles.finalPanel}>
              <h2 className={styles.finalTitle}>
                <span>Start with</span> one stock
              </h2>
              <p className={styles.finalSub}>
                Search a symbol, read the indicators, and see the reasoning behind the score.
              </p>
              <div className={styles.cta}>
                <GetStarted />
                <Link className={styles.btn} href="/login">
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={cn(styles.container, styles.footerInner)}>
          <div>
            <Logo />
            <p>
              UntoldMoney is an analytics platform for educational and informational purposes
              only. It does not constitute financial advice. Past performance is not indicative of
              future results. Always consult a qualified financial advisor before making investment
              decisions.
            </p>
          </div>
          <span>© UntoldMoney</span>
        </div>
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <Link className={styles.logo} href="/">
      <span className={styles.logoMark}>
        <svg width="18" height="18" viewBox="0 0 26 26" aria-hidden="true">
          <path d="M2 10 10 2h6L2 16zM24 16l-8 8h-6l14-14z" fill="#fff" />
        </svg>
      </span>
      UntoldMoney
    </Link>
  );
}

function GetStarted() {
  return (
    <Link className={cn(styles.btn, styles.btnDark, styles.btnWithArrow)} href="/register">
      Get Started
      <span className={styles.btnArrow}>
        <ArrowUpRight size={18} strokeWidth={2.4} />
      </span>
    </Link>
  );
}
