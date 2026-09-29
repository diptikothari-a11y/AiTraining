import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Log in · TradeSmart PMS',
    loadComponent: () => import('./pages/auth/login').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Open account · TradeSmart PMS',
    loadComponent: () => import('./pages/auth/register').then((m) => m.RegisterPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · TradeSmart PMS',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'holdings',
        title: 'Holdings · TradeSmart PMS',
        loadComponent: () => import('./pages/holdings/holdings').then((m) => m.HoldingsPage),
      },
      {
        path: 'trades',
        title: 'Trades · TradeSmart PMS',
        loadComponent: () => import('./pages/trades/trades').then((m) => m.TradesPage),
      },
      {
        path: 'watchlist',
        title: 'Watchlist · TradeSmart PMS',
        loadComponent: () => import('./pages/watchlist/watchlist').then((m) => m.WatchlistPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
