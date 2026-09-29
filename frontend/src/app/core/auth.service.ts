import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { TokenResponse, User } from './models';

const STORAGE_KEY = 'pms.session';

interface Session {
  token: string;
  expiresAt: number;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private session = signal<Session | null>(this.restore());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isLoggedIn = computed(() => {
    const s = this.session();
    return !!s && s.expiresAt > Date.now();
  });

  get token(): string | null {
    return this.isLoggedIn() ? this.session()!.token : null;
  }

  login(email: string, password: string) {
    return this.http
      .post<TokenResponse>('/api/auth/login', { email, password })
      .pipe(tap((r) => this.store(r)));
  }

  register(body: { name: string; email: string; mobile: string; password: string }) {
    return this.http.post<TokenResponse>('/api/auth/register', body).pipe(tap((r) => this.store(r)));
  }

  logout(reason?: 'expired') {
    this.session.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.router.navigate(['/login'], { queryParams: reason ? { reason } : {} });
  }

  private store(r: TokenResponse) {
    const s: Session = { token: r.access_token, expiresAt: Date.now() + r.expires_in * 1000, user: r.user };
    this.session.set(s);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {}
  }

  private restore(): Session | null {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Session | null;
      return s && s.expiresAt > Date.now() ? s : null;
    } catch {
      return null;
    }
  }
}
