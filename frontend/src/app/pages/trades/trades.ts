import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, errorMessage } from '../../core/api.service';
import { Exchange, Side, Stock, Trade } from '../../core/models';
import { InrPipe, QtyPipe } from '../../shared/format';
import { Icon } from '../../shared/icon';

const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

@Component({
  selector: 'app-trades',
  imports: [ReactiveFormsModule, DatePipe, InrPipe, QtyPipe, Icon],
  templateUrl: './trades.html',
  styleUrl: './trades.scss',
})
export class TradesPage {
  private api = inject(ApiService);

  /** Optional pre-fill from query params, e.g. /trades?symbol=TCS&side=BUY */
  symbol = input<string>();
  side = input<string>();

  protected stocks = signal<Stock[]>([]);
  protected trades = signal<Trade[]>([]);
  protected loading = signal(true);
  protected saving = signal(false);
  protected error = signal('');
  protected formError = signal('');
  protected success = signal('');
  protected filter = signal<'ALL' | Side>('ALL');
  protected maxDate = today();

  protected form = inject(NonNullableFormBuilder).group({
    symbol: ['', Validators.required],
    exchange: ['NSE' as Exchange, Validators.required],
    side: ['BUY' as Side, Validators.required],
    quantity: [1, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    price: [0, [Validators.required, Validators.min(0.05)]],
    trade_date: [today(), Validators.required],
  });

  private formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected selected = computed(() => this.stocks().find((s) => s.symbol === this.formValue().symbol) ?? null);
  protected orderValue = computed(() => (this.formValue().quantity ?? 0) * (this.formValue().price ?? 0));
  protected visibleTrades = computed(() =>
    this.filter() === 'ALL' ? this.trades() : this.trades().filter((t) => t.side === this.filter()),
  );

  constructor() {
    this.api.stocks().subscribe((s) => {
      this.stocks.set(s);
      this.applyPrefill();
    });
    this.loadTrades();

    // Pre-fill the price with LTP whenever the user picks a different stock.
    let lastSymbol = '';
    effect(() => {
      const s = this.selected();
      if (s && s.symbol !== lastSymbol) {
        lastSymbol = s.symbol;
        this.form.controls.price.setValue(s.ltp);
      }
    });
  }

  private applyPrefill() {
    const sym = this.symbol()?.toUpperCase();
    if (sym && this.stocks().some((s) => s.symbol === sym)) this.form.controls.symbol.setValue(sym);
    const side = this.side()?.toUpperCase();
    if (side === 'BUY' || side === 'SELL') this.form.controls.side.setValue(side);
  }

  loadTrades() {
    this.api.trades().subscribe({
      next: (t) => {
        this.trades.set(t);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  setSide(side: Side) {
    this.form.controls.side.setValue(side);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    this.success.set('');
    const v = this.form.getRawValue();
    this.api.addTrade({ ...v, quantity: Number(v.quantity), price: Number(v.price) }).subscribe({
      next: (t) => {
        this.success.set(`${t.side === 'BUY' ? 'Bought' : 'Sold'} ${t.quantity} ${t.symbol} @ ₹${t.price.toFixed(2)}`);
        this.form.patchValue({ quantity: 1 });
        this.form.markAsUntouched();
        this.saving.set(false);
        this.loadTrades();
      },
      error: (e) => {
        this.formError.set(errorMessage(e));
        this.saving.set(false);
      },
    });
  }

  remove(t: Trade) {
    if (!confirm(`Delete ${t.side} ${t.quantity} ${t.symbol} on ${t.trade_date}? Holdings will be recalculated.`)) return;
    this.api.deleteTrade(t.id).subscribe({
      next: () => this.trades.update((list) => list.filter((x) => x.id !== t.id)),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
