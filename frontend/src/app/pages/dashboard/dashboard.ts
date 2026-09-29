import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Holding, PortfolioSummary } from '../../core/models';
import { DonutChart } from '../../shared/donut-chart';
import { InrPipe, PctPipe, QtyPipe, TonePipe } from '../../shared/format';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DonutChart, InrPipe, PctPipe, QtyPipe, TonePipe, Icon],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardPage {
  private api = inject(ApiService);
  protected auth = inject(AuthService);

  protected summary = signal<PortfolioSummary | null>(null);
  protected holdings = signal<Holding[]>([]);
  protected loading = signal(true);
  protected refreshing = signal(false);
  protected error = signal('');
  protected updatedAt = signal<Date | null>(null);

  protected sectorSlices = computed(() =>
    (this.summary()?.sectors ?? []).map((s) => ({ label: s.sector, value: s.value })),
  );
  protected topHoldings = computed(() => this.holdings().slice(0, 5));
  protected greeting = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  });

  constructor() {
    this.load();
  }

  load() {
    forkJoin([this.api.summary(), this.api.holdings()]).subscribe({
      next: ([s, h]) => {
        this.summary.set(s);
        this.holdings.set(h);
        this.error.set('');
        this.updatedAt.set(new Date());
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });
  }

  refreshPrices() {
    this.refreshing.set(true);
    this.api.tick().subscribe({
      next: () => this.load(),
      error: (e) => {
        this.error.set(errorMessage(e));
        this.refreshing.set(false);
      },
    });
  }
}
