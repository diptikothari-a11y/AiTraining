import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { Holding } from '../../core/models';
import { InrPipe, PctPipe, QtyPipe, TonePipe } from '../../shared/format';
import { Icon } from '../../shared/icon';

type SortKey = 'symbol' | 'quantity' | 'avg_price' | 'ltp' | 'invested' | 'current_value' | 'pnl' | 'pnl_pct' | 'day_change';

@Component({
  selector: 'app-holdings',
  imports: [RouterLink, InrPipe, PctPipe, QtyPipe, TonePipe, Icon],
  templateUrl: './holdings.html',
  styles: `
    .search { position: relative; width: 260px; max-width: 100%; }
    .search app-icon { position: absolute; left: 10px; top: 11px; color: var(--text-subtle); }
    .search .input { padding-left: 34px; }
    .sort-ind { font-size: 10px; margin-left: 2px; }
  `,
})
export class HoldingsPage {
  private api = inject(ApiService);

  protected holdings = signal<Holding[]>([]);
  protected loading = signal(true);
  protected error = signal('');
  protected query = signal('');
  protected sortKey = signal<SortKey>('current_value');
  protected sortDir = signal<1 | -1>(-1);

  protected columns: { key: SortKey; label: string; right?: boolean }[] = [
    { key: 'symbol', label: 'Stock' },
    { key: 'quantity', label: 'Qty', right: true },
    { key: 'avg_price', label: 'Avg cost', right: true },
    { key: 'ltp', label: 'LTP', right: true },
    { key: 'invested', label: 'Invested', right: true },
    { key: 'current_value', label: 'Current value', right: true },
    { key: 'pnl', label: 'P&L', right: true },
    { key: 'pnl_pct', label: 'Net chg.', right: true },
    { key: 'day_change', label: 'Day chg.', right: true },
  ];

  protected rows = computed(() => {
    const q = this.query().trim().toLowerCase();
    const key = this.sortKey();
    const dir = this.sortDir();
    return this.holdings()
      .filter((h) => !q || h.symbol.toLowerCase().includes(q) || h.name.toLowerCase().includes(q) || h.sector.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        return (typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)) * dir;
      });
  });

  protected totals = computed(() => {
    const r = this.rows();
    const invested = r.reduce((a, h) => a + h.invested, 0);
    const current = r.reduce((a, h) => a + h.current_value, 0);
    const day = r.reduce((a, h) => a + h.day_change, 0);
    return { invested, current, pnl: current - invested, pnlPct: invested ? ((current - invested) / invested) * 100 : 0, day };
  });

  constructor() {
    this.api.holdings().subscribe({
      next: (h) => {
        this.holdings.set(h);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  sort(key: SortKey) {
    if (this.sortKey() === key) this.sortDir.set(this.sortDir() === 1 ? -1 : 1);
    else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'symbol' ? 1 : -1);
    }
  }

  exportCsv() {
    const header = ['Symbol', 'Name', 'Sector', 'Qty', 'Avg cost', 'LTP', 'Invested', 'Current value', 'P&L', 'P&L %'];
    const lines = this.rows().map((h) =>
      [h.symbol, h.name, h.sector, h.quantity, h.avg_price, h.ltp, h.invested, h.current_value, h.pnl, h.pnl_pct]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `holdings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
