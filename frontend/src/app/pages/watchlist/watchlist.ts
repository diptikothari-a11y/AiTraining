import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { Stock } from '../../core/models';
import { InrPipe, PctPipe, TonePipe } from '../../shared/format';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-watchlist',
  imports: [RouterLink, InrPipe, PctPipe, TonePipe, Icon],
  templateUrl: './watchlist.html',
  styleUrl: './watchlist.scss',
})
export class WatchlistPage {
  private api = inject(ApiService);

  protected items = signal<Stock[]>([]);
  protected universe = signal<Stock[]>([]);
  protected loading = signal(true);
  protected error = signal('');
  protected query = signal('');

  private watched = computed(() => new Set(this.items().map((s) => s.symbol)));
  protected suggestions = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];
    return this.universe()
      .filter((s) => !this.watched().has(s.symbol))
      .filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 6);
  });

  constructor() {
    this.load();
    this.api.stocks().subscribe((s) => this.universe.set(s));
  }

  load() {
    this.api.watchlist().subscribe({
      next: (w) => {
        this.items.set(w);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  add(s: Stock) {
    this.query.set('');
    this.items.update((list) => [...list, s]); // optimistic
    this.api.watch(s.symbol).subscribe({ error: (e) => (this.error.set(errorMessage(e)), this.load()) });
  }

  remove(s: Stock) {
    this.items.update((list) => list.filter((x) => x.symbol !== s.symbol));
    this.api.unwatch(s.symbol).subscribe({ error: (e) => (this.error.set(errorMessage(e)), this.load()) });
  }
}
