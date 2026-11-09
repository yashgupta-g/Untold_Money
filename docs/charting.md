# Charts: TradingView Advanced Charts

Stock pages use TradingView's **Advanced Charts** (Charting Library) on each
user's own broker data. That covers every chart type, 100+ indicators,
drawing tools, compare, and intraday to weekly timeframes, with the live
price updating the last candle.

## Install the library

The library is free but licensed: TradingView distributes it privately
through a GitHub repo you're given access to after applying, so it can't be
installed from npm or committed here.

1. Apply at https://www.tradingview.com/advanced-charts/ and accept the licence.
2. Once you have access, copy the `charting_library/` folder from TradingView's
   repo into `apps/web/public/`. It's git-ignored, and the web container
   serves it through the `./apps/web` volume.
3. Reload a stock page. The app loads
   `/charting_library/charting_library.standalone.js`. Until that file exists,
   it shows a plain candlestick chart instead.

For production, add the folder in the deploy step (from a private artifact
store), not from git.

## How data flows

| Piece | Where |
|---|---|
| Widget and fallback | `apps/web/components/charts/tradingview/` |
| Datafeed (JS API) | `apps/web/lib/tradingview/datafeed.ts` |
| History | `GET /api/v1/market-data/{symbol}/candles?interval&start&end` (user's Fyers) |
| Live bars | `lib/liveFeed.ts` ticks from `WS /api/v1/stream` |
| Symbol search and resolve | `/api/v1/instruments` (NSE symbol master) |

Resolutions are 1, 5, 15, 60 and 240 minutes, plus 1D and 1W. The session is
09:15–15:30 Asia/Kolkata. Chart layouts and drawings are kept in the user's
browser; server-side save and load isn't built yet (`header_saveload` is
disabled).
