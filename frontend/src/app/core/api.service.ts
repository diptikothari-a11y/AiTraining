import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Holding, PortfolioSummary, Stock, Trade, TradeCreate } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  summary() {
    return this.http.get<PortfolioSummary>('/api/portfolio/summary');
  }
  holdings() {
    return this.http.get<Holding[]>('/api/portfolio/holdings');
  }

  stocks(q = '') {
    return this.http.get<Stock[]>('/api/market/stocks', { params: new HttpParams().set('q', q) });
  }
  tick() {
    return this.http.post<Stock[]>('/api/market/tick', {});
  }

  trades() {
    return this.http.get<Trade[]>('/api/trades');
  }
  addTrade(body: TradeCreate) {
    return this.http.post<Trade>('/api/trades', body);
  }
  deleteTrade(id: number) {
    return this.http.delete<void>(`/api/trades/${id}`);
  }

  watchlist() {
    return this.http.get<Stock[]>('/api/watchlist');
  }
  watch(symbol: string) {
    return this.http.post('/api/watchlist', { symbol });
  }
  unwatch(symbol: string) {
    return this.http.delete<void>(`/api/watchlist/${encodeURIComponent(symbol)}`);
  }
}

/** Turns a FastAPI error body (string or validation list) into one readable message. */
export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the server. Is the backend running on port 8000?';
    const detail = err.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length) {
      return detail.map((d: { msg: string }) => d.msg.replace(/^Value error, /, '')).join('. ');
    }
  }
  return 'Something went wrong. Please try again.';
}
