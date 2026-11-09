// Copy and sample data for the marketing landing page. All figures are
// illustrative.
//
// Photography is from Pexels (free to use, no attribution required); the
// device screens are sample UntoldMoney screens composited onto those photos.
// Replace any file in /public/landing with a real capture of the same size.

export type Media = { src: string; width: number; height: number };

export const MEDIA = {
  ridge: { src: "/landing/photos/ridge.webp", width: 1000, height: 1250 }, // Pexels 2132087
  mountains: { src: "/landing/photos/mountains.webp", width: 2000, height: 1333 }, // Pexels 10144922
  handAnalyze: { src: "/landing/hand-analyze.webp", width: 1600, height: 1600 }, // Pexels 30909364
  handAlerts: { src: "/landing/hand-alerts.webp", width: 1800, height: 1200 }, // Pexels 8217517
  handTablet: { src: "/landing/hand-tablet.webp", width: 1800, height: 1200 }, // Pexels 6913234
} satisfies Record<string, Media>;

/** Product showcase loop, rendered from the journal dashboard. */
export const SHOWCASE = {
  src: "/landing/showcase.mp4",
  poster: "/landing/showcase-poster.webp",
  width: 1600,
  height: 900,
};

/** One hand photo (Pexels 8217475) with a different screen per story step. */
const STORY_SIZE = { width: 1400, height: 1575 };

export const NAV_LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#story", label: "How it works" },
  { href: "#tools", label: "Tools" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/** What UntoldMoney is, in one line, everywhere it needs saying. */
export const POSITIONING = {
  eyebrow: "AI-powered personal finance",
  line: "Market data, AI stock analysis, capital allocation and your trade journal in one workspace, with alerts, broker trading, backtesting and an AI analyst on the way.",
};

/**
 * The platform: what is live today and what is in the pipeline. Status is
 * the single place to flip a module from "soon" to "live" when it ships.
 */
export type ModuleStatus = "live" | "soon";
export type PlatformModule = {
  id:
    | "analysis"
    | "market"
    | "allocation"
    | "journal"
    | "alerts"
    | "trading"
    | "analyst"
    | "backtest";
  name: string;
  body: string;
  status: ModuleStatus;
};

export const PLATFORM: PlatformModule[] = [
  {
    id: "analysis",
    name: "AI stock analysis",
    body: "ML models on any NSE stock, run on the horizon and signals you choose.",
    status: "live",
  },
  {
    id: "market",
    name: "Market data",
    body: "Prices, candles, volume and company details, with indicators drawn in.",
    status: "live",
  },
  {
    id: "allocation",
    name: "Capital allocation",
    body: "Where your money sits by stock and sector, checked against your limits.",
    status: "live",
  },
  {
    id: "journal",
    name: "Trade journal",
    body: "Every trade tagged by strategy, mistake and emotion, then measured.",
    status: "live",
  },
  {
    id: "alerts",
    name: "Alerts",
    body: "Price and indicator rules that reach you in the app and by email.",
    status: "soon",
  },
  {
    id: "trading",
    name: "Broker trading",
    body: "Connect your broker account and place orders from your workspace.",
    status: "soon",
  },
  {
    id: "analyst",
    name: "AI analyst chat",
    body: "Ask about a stock or your portfolio and get answers in plain language.",
    status: "soon",
  },
  {
    id: "backtest",
    name: "Backtesting",
    body: "Test a strategy against years of history before you risk money on it.",
    status: "soon",
  },
];

// Sample prices and day moves for NSE large caps, for illustration only.
export type TickerItem = { symbol: string; name: string; price: number; change: number };

export const TICKER_ROWS: TickerItem[][] = [
  [
    { symbol: "RELIANCE", name: "Reliance Industries", price: 2948.6, change: 1.24 },
    { symbol: "TCS", name: "Tata Consultancy", price: 4012.35, change: 0.86 },
    { symbol: "HDFCBANK", name: "HDFC Bank", price: 1632.1, change: -0.42 },
    { symbol: "INFY", name: "Infosys", price: 1874.4, change: 1.05 },
    { symbol: "ICICIBANK", name: "ICICI Bank", price: 1288.75, change: 0.31 },
    { symbol: "ITC", name: "ITC", price: 476.2, change: -0.18 },
    { symbol: "LT", name: "Larsen & Toubro", price: 3651.9, change: 1.47 },
    { symbol: "SBIN", name: "State Bank of India", price: 812.45, change: -0.66 },
    { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 1586.3, change: 0.92 },
    { symbol: "HINDUNILVR", name: "Hindustan Unilever", price: 2398.15, change: -0.27 },
    { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", price: 1754.6, change: 0.14 },
    { symbol: "AXISBANK", name: "Axis Bank", price: 1162.8, change: -0.51 },
  ],
  [
    { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 7214.5, change: 0.73 },
    { symbol: "ASIANPAINT", name: "Asian Paints", price: 2876.25, change: -1.12 },
    { symbol: "MARUTI", name: "Maruti Suzuki", price: 12480.0, change: 0.38 },
    { symbol: "SUNPHARMA", name: "Sun Pharma", price: 1812.7, change: -0.84 },
    { symbol: "TITAN", name: "Titan Company", price: 3496.4, change: 0.57 },
    { symbol: "ULTRACEMCO", name: "UltraTech Cement", price: 11204.9, change: 0.22 },
    { symbol: "WIPRO", name: "Wipro", price: 548.35, change: -0.35 },
    { symbol: "NESTLEIND", name: "Nestlé India", price: 2462.1, change: -0.09 },
    { symbol: "TATAMOTORS", name: "Tata Motors", price: 962.55, change: 1.88 },
    { symbol: "POWERGRID", name: "Power Grid", price: 328.4, change: 0.44 },
    { symbol: "NTPC", name: "NTPC", price: 384.65, change: 0.61 },
    { symbol: "HCLTECH", name: "HCL Technologies", price: 1786.2, change: 0.95 },
  ],
];

export type StoryStep = {
  id: string;
  question: string;
  title: string;
  body: string;
  image: Media;
  imageAlt: string;
  callouts: [string, string];
};

export const STORY: StoryStep[] = [
  {
    id: "analyze",
    question: "What does the data say?",
    title: "Analyse any NSE stock your way",
    body: "Pick the stock, the horizon and the signals you care about. The ML models read the market data and show what drove their view. No black box, no tips.",
    image: { src: "/landing/hand-story-analyze.webp", ...STORY_SIZE },
    imageAlt:
      "A hand holding a phone showing a sample UntoldMoney stock screen for RELIANCE with a one-month price chart and indicator signals",
    callouts: ["Your setup: 3-day horizon", "RSI 14 at 48.2"],
  },
  {
    id: "portfolio",
    question: "Where is my risk?",
    title: "See concentration before it bites",
    body: "Holdings valued from stored prices, split by sector, with a warning the moment one position passes your limit.",
    image: { src: "/landing/hand-story-portfolio.webp", ...STORY_SIZE },
    imageAlt:
      "A hand holding a phone showing a sample portfolio worth ₹12,45,680 across five holdings, with HDFCBANK flagged at 34.2% of value",
    callouts: ["+9.5% unrealized", "1 holding above 30%"],
  },
  {
    id: "journal",
    question: "What do I keep getting wrong?",
    title: "Turn every trade into a lesson",
    body: "Tag strategy, mistake and emotion. The journal tallies win rate and profit factor, and names the mistake that keeps repeating.",
    image: { src: "/landing/hand-story-journal.webp", ...STORY_SIZE },
    imageAlt:
      "A hand holding a phone showing a sample trade journal with a 58% win rate, profit factor 1.6 and a repeated early-exit mistake",
    callouts: ["Win rate 58%", "Early exit × 4"],
  },
];

export type TourTab = {
  id: "analysis" | "market" | "allocation" | "journal";
  label: string;
  title: string;
  body: string;
};

/** Product tour tabs; the matching sample screens live in Tour.tsx. */
export const TOUR_TABS: TourTab[] = [
  {
    id: "analysis",
    label: "AI analysis",
    title: "Analysis on your terms",
    body: "Choose a stock and a horizon. The model gives its read with a confidence, beside its accuracy on recent history it never trained on. Under 80 candles, it stays quiet.",
  },
  {
    id: "market",
    label: "Market data",
    title: "Price, volume and trend on one chart",
    body: "Daily candles for any NSE stock, with volume underneath and the 20-day average drawn through them. Each indicator reading sits next to the rule behind it.",
  },
  {
    id: "allocation",
    label: "Allocation",
    title: "Where your capital actually sits",
    body: "Holdings valued from stored prices and split by weight, with a warning as soon as one position passes the limit you set.",
  },
  {
    id: "journal",
    label: "Journal",
    title: "Every trade, reviewed",
    body: "Tag the strategy, mistake and emotion behind each trade. The journal tallies win rate and profit factor and names the habit that keeps costing you.",
  },
];

export type Tool = {
  id: string;
  name: string;
  body: string;
  meta: string;
};

export const TOOLS: Tool[] = [
  {
    id: "analysis",
    name: "AI stock analysis",
    body: "Run the models on any NSE stock with the horizon and signals you choose, and see what drove each result.",
    meta: "Direction and price range, 1 to 10 days",
  },
  {
    id: "market",
    name: "Market data",
    body: "Live prices, intraday to weekly candles and volume for every NSE stock and index.",
    meta: "Live from your own broker account",
  },
  {
    id: "ml",
    name: "ML models",
    body: "Gradient boosting on 23 features, tested on the latest 20% of history it never saw.",
    meta: "Accuracy shown beside every result",
  },
  {
    id: "allocation",
    name: "Capital allocation",
    body: "Value, unrealized P&L and sector split, with a flag when one holding grows past your limit.",
    meta: "Limits you set, checked on every update",
  },
  {
    id: "journal",
    name: "Trade journal",
    body: "Tag the strategy, mistake and emotion behind each trade, then see what they cost you.",
    meta: "Win rate, profit factor, expectancy",
  },
  {
    id: "alerts",
    name: "Alerts",
    body: "Price and indicator alerts that reach you in the app and by email.",
    meta: "Price, RSI, SMA and MACD triggers",
  },
];

export const INDICATORS = [
  { name: "SMA 20 / 50", rule: "Bullish if close is above", candles: "20 / 50" },
  { name: "EMA 20", rule: "Bullish if close is above", candles: "20" },
  { name: "RSI 14", rule: "Bearish above 70, bullish below 30", candles: "15" },
  { name: "MACD + signal", rule: "Bullish if MACD is above 0", candles: "35" },
  { name: "ATR 14", rule: "Volatility only, no direction", candles: "15" },
];

/** What you can set on an analysis run. */
export const PARAMETERS = [
  { label: "Stock", value: "Any NSE symbol" },
  { label: "Horizon", value: "1 to 10 trading days" },
  { label: "Signals", value: "SMA, EMA, RSI, MACD, ATR" },
  { label: "Output", value: "Direction or price range" },
];

export const LIMITS = [
  {
    title: "Market data needs your broker",
    body: "Prices and charts come from your own Fyers account. Brokers end API sessions daily, so you reconnect each morning.",
  },
  {
    title: "Predictions are statistical",
    body: "They describe historical patterns and carry no guarantee.",
  },
  {
    title: "Your money stays with your broker",
    body: "When broker trading arrives, orders will go to your own broker account and every one will be yours to confirm. UntoldMoney never holds your funds.",
  },
];

export const METHOD = [
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
    body: "Under 80 candles, it returns no prediction rather than a weak one.",
  },
];

// Placeholder plans and prices until billing ships (roadmap phase 8).
export type Plan = {
  id: string;
  name: string;
  blurb: string;
  monthly: number;
  yearly: number;
  cta: string;
  featured?: boolean;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    blurb: "For getting a feel for the numbers.",
    monthly: 0,
    yearly: 0,
    cta: "Start free",
    features: [
      "AI stock analysis for NSE stocks",
      "Market data and charts",
      "One portfolio",
      "Journal up to 50 trades",
      "3 price alerts",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    blurb: "For investors who review every decision.",
    monthly: 499,
    yearly: 399,
    cta: "Start Pro",
    featured: true,
    features: [
      "Everything in Starter",
      "Custom horizons and signals",
      "Unlimited portfolios",
      "Unlimited journal with CSV export",
      "25 price and indicator alerts",
      "Position sizing calculator",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    blurb: "For active traders who want depth.",
    monthly: 1499,
    yearly: 1199,
    cta: "Start Elite",
    features: [
      "Everything in Pro",
      "Drawdown and Sharpe ratio tracking",
      "100 alerts with email delivery",
      "API access when it launches",
      "Priority support",
    ],
  },
];

// Who UntoldMoney is for. Personas with stock portraits (Pexels), not
// testimonials: no names, quotes or claims attached to real people.
/**
 * The reel: the people the app is for, alternating with the screens they
 * open most. Personas and usage are illustrative, not testimonials.
 */
export type ReelItem = {
  src: string;
  width: number;
  height: number;
  shape: "portrait" | "landscape";
  kind: "Investor" | "Tool";
  title: string;
  note: string;
  alt: string;
};

export const REEL: ReelItem[] = [
  {
    src: "/landing/people/swing-trader.webp", // Pexels 4260124
    width: 600,
    height: 750,
    shape: "portrait",
    kind: "Investor",
    title: "Swing trader",
    note: "Runs 3-day analysis before every trade",
    alt: "Portrait of a swing trader",
  },
  {
    src: "/landing/hand-story-analyze.webp",
    width: 1400,
    height: 1575,
    shape: "portrait",
    kind: "Tool",
    title: "Stock analysis",
    note: "Price, indicators and the AI's read on one screen",
    alt: "A hand holding a phone showing a sample stock analysis screen for RELIANCE",
  },
  {
    src: "/landing/people/working-professional.webp", // Pexels 7752822
    width: 600,
    height: 750,
    shape: "portrait",
    kind: "Investor",
    title: "Working professional",
    note: "Checks the portfolio X-ray on weekends",
    alt: "Portrait of a working professional",
  },
  {
    src: "/landing/hand-story-portfolio.webp",
    width: 1400,
    height: 1575,
    shape: "portrait",
    kind: "Tool",
    title: "Portfolio X-ray",
    note: "Weights by stock and sector, with a limit",
    alt: "A hand holding a phone showing a sample portfolio with one holding flagged above 30%",
  },
  {
    src: "/landing/people/first-time-investor.webp", // Pexels 6977987
    width: 600,
    height: 750,
    shape: "portrait",
    kind: "Investor",
    title: "First-time investor",
    note: "Learns from the reason behind each number",
    alt: "Portrait of a first-time investor",
  },
  {
    src: "/landing/hand-alerts.webp",
    width: 1800,
    height: 1200,
    shape: "landscape",
    kind: "Tool",
    title: "Alerts",
    note: "Price and indicator rules, in the app and by email",
    alt: "A hand holding a phone showing sample price and indicator alerts",
  },
  {
    src: "/landing/people/long-term-investor.webp", // Pexels 26844139
    width: 600,
    height: 750,
    shape: "portrait",
    kind: "Investor",
    title: "Long-term investor",
    note: "Reads the model's track record first",
    alt: "Portrait of a long-term investor",
  },
  {
    src: "/landing/hand-story-journal.webp",
    width: 1400,
    height: 1575,
    shape: "portrait",
    kind: "Tool",
    title: "Trade journal",
    note: "Strategy, mistake and emotion on every trade",
    alt: "A hand holding a phone showing a sample trade journal",
  },
  {
    src: "/landing/people/active-trader.webp", // Pexels 36291553
    width: 600,
    height: 750,
    shape: "portrait",
    kind: "Investor",
    title: "Active trader",
    note: "Logs every trade and tags every mistake",
    alt: "Portrait of an active trader",
  },
  {
    src: "/landing/hand-tablet.webp",
    width: 1800,
    height: 1200,
    shape: "landscape",
    kind: "Tool",
    title: "Any screen",
    note: "The same tools in the browser on tablet and desktop",
    alt: "Hands holding a tablet showing a sample UntoldMoney dashboard",
  },
  {
    src: "/landing/people/retired-investor.webp", // Pexels 20406559
    width: 600,
    height: 750,
    shape: "portrait",
    kind: "Investor",
    title: "Retired investor",
    note: "Lets alerts do the watching",
    alt: "Portrait of a retired investor",
  },
  {
    src: "/landing/hand-analyze.webp",
    width: 1600,
    height: 1600,
    shape: "portrait",
    kind: "Tool",
    title: "Indicators",
    note: "Seven indicators, each with the rule behind it",
    alt: "A hand holding a phone showing sample indicator readings",
  },
];

export const FAQS = [
  {
    q: "Is UntoldMoney financial advice?",
    a: "No. It is an analytics and decision-support platform. It shows market data, computed indicators and statistical estimates with the inputs behind them. Decisions stay with you.",
  },
  {
    q: "Where does the market data come from?",
    a: "From your own broker. Connect Fyers and prices, charts and analysis come live from your account, shown only to you. Without a connection, market screens ask you to connect instead of showing stale data.",
  },
  {
    q: "How are ML predictions validated?",
    a: "Each model trains on the earlier 80% of a stock's history and is tested on the latest 20%, in time order, so it never sees the future. The validation accuracy is shown next to every prediction.",
  },
  {
    q: "Can I trade from UntoldMoney?",
    a: "Not yet. Broker trading is coming: you'll connect your own broker account, confirm each order from your workspace, and see filled trades land in your journal. Your money always stays with your broker.",
  },
  {
    q: "What else can I do besides analysis?",
    a: "Today: track your portfolio and allocation, and journal every trade with its strategy, mistake and emotion. Coming next: alerts, broker trading, an AI analyst you can ask in plain language, and backtesting against years of history.",
  },
  {
    q: "Which markets are covered?",
    a: "NSE stocks today. BSE is planned.",
  },
  {
    q: "Can I change or cancel my plan?",
    a: "Yes. You can move between plans or cancel at any time from settings, and Starter stays free.",
  },
];
