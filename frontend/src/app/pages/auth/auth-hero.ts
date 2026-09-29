import { Component } from '@angular/core';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-auth-hero',
  imports: [Icon],
  styleUrl: './auth-hero.scss',
  template: `
    <div class="brand">
      <span class="logo"><app-icon name="trend" /></span>
      TradeSmart PMS
    </div>
    <h1>Track every rupee of your equity portfolio.</h1>
    <p>Holdings, P&amp;L, sector allocation and trade history for NSE &amp; BSE stocks, in one place.</p>
    <ul>
      <li><app-icon name="dashboard" /> Live dashboard with day and overall P&amp;L</li>
      <li><app-icon name="trades" /> Weighted-average cost and realised gains</li>
      <li><app-icon name="shield" /> Secure login, your data stays yours</li>
    </ul>
  `,
})
export class AuthHero {}
