export interface User {
  id: number;
  name: string;
  email: string;
  mobile: string | null;
  client_code: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  ltp: number;
  prev_close: number;
  change: number;
  change_pct: number;
}

export type Side = 'BUY' | 'SELL';
export type Exchange = 'NSE' | 'BSE';

export interface Trade {
  id: number;
  symbol: string;
  name: string;
  exchange: Exchange;
  side: Side;
  quantity: number;
  price: number;
  value: number;
  trade_date: string;
}

export interface TradeCreate {
  symbol: string;
  exchange: Exchange;
  side: Side;
  quantity: number;
  price: number;
  trade_date: string;
}

export interface Holding {
  symbol: string;
  name: string;
  sector: string;
  quantity: number;
  avg_price: number;
  ltp: number;
  prev_close: number;
  invested: number;
  current_value: number;
  pnl: number;
  pnl_pct: number;
  day_change: number;
  day_change_pct: number;
  weight_pct: number;
}

export interface SectorAllocation {
  sector: string;
  value: number;
  weight_pct: number;
}

export interface PortfolioSummary {
  invested: number;
  current_value: number;
  total_pnl: number;
  total_pnl_pct: number;
  day_pnl: number;
  day_pnl_pct: number;
  realised_pnl: number;
  holdings_count: number;
  sectors: SectorAllocation[];
  top_gainers: Holding[];
  top_losers: Holding[];
}
