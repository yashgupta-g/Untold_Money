/**
 * The parts of the TradingView Advanced Charts (Charting Library) API this
 * app uses. The full typings ship with the licensed library as
 * charting_library.d.ts; these mirror them so the app builds without it.
 */

export type ResolutionString = string;

export interface Bar {
  time: number; // ms since epoch (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface LibrarySymbolInfo {
  name: string;
  ticker?: string;
  full_name?: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  exchange: string;
  listed_exchange: string;
  format: "price" | "volume";
  minmov: number;
  pricescale: number;
  has_intraday?: boolean;
  has_daily?: boolean;
  has_weekly_and_monthly?: boolean;
  intraday_multipliers?: string[];
  daily_multipliers?: string[];
  weekly_multipliers?: string[];
  supported_resolutions?: ResolutionString[];
  volume_precision?: number;
  data_status?: "streaming" | "endofday" | "delayed_streaming";
  visible_plots_set?: "ohlcv" | "ohlc" | "c";
}

export interface SearchSymbolResultItem {
  symbol: string;
  full_name: string;
  description: string;
  exchange: string;
  ticker?: string;
  type: string;
}

export interface PeriodParams {
  from: number; // seconds
  to: number; // seconds
  countBack: number;
  firstDataRequest: boolean;
}

export interface HistoryMetadata {
  noData?: boolean;
  nextTime?: number | null;
}

export interface DatafeedConfiguration {
  supported_resolutions: ResolutionString[];
  exchanges?: { value: string; name: string; desc: string }[];
  symbols_types?: { name: string; value: string }[];
  supports_marks?: boolean;
  supports_timescale_marks?: boolean;
  supports_time?: boolean;
}

export interface IBasicDataFeed {
  onReady(callback: (configuration: DatafeedConfiguration) => void): void;
  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: (items: SearchSymbolResultItem[]) => void
  ): void;
  resolveSymbol(
    symbolName: string,
    onResolve: (symbolInfo: LibrarySymbolInfo) => void,
    onError: (reason: string) => void
  ): void;
  getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: PeriodParams,
    onResult: (bars: Bar[], meta?: HistoryMetadata) => void,
    onError: (reason: string) => void
  ): void;
  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    onTick: (bar: Bar) => void,
    listenerGuid: string,
    onResetCacheNeededCallback: () => void
  ): void;
  unsubscribeBars(listenerGuid: string): void;
}

export interface ChartingLibraryWidgetOptions {
  container: HTMLElement;
  library_path: string;
  datafeed: IBasicDataFeed;
  symbol: string;
  interval: ResolutionString;
  locale: string;
  timezone?: string;
  autosize?: boolean;
  theme?: "light" | "dark";
  disabled_features?: string[];
  enabled_features?: string[];
  overrides?: Record<string, string | number | boolean>;
  studies_overrides?: Record<string, string | number | boolean>;
  loading_screen?: { backgroundColor?: string; foregroundColor?: string };
  custom_font_family?: string;
  favorites?: { intervals?: ResolutionString[]; chartTypes?: string[] };
}

export interface IChartingLibraryWidget {
  onChartReady(callback: () => void): void;
  setSymbol(symbol: string, interval: ResolutionString, callback?: () => void): void;
  remove(): void;
}

declare global {
  interface Window {
    TradingView?: { widget: new (options: ChartingLibraryWidgetOptions) => IChartingLibraryWidget };
  }
}
