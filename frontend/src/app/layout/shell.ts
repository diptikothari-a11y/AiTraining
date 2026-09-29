import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected auth = inject(AuthService);
  protected theme = inject(ThemeService);

  protected nav = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/holdings', label: 'Holdings', icon: 'holdings' },
    { path: '/trades', label: 'Trades', icon: 'trades' },
    { path: '/watchlist', label: 'Watchlist', icon: 'star' },
  ];

  protected initials = computed(() =>
    (this.auth.user()?.name ?? '?')
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  );
}
