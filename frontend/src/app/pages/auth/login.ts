import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AuthHero } from './auth-hero';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthHero],
  styleUrl: './auth-layout.scss',
  template: `
    <app-auth-hero />
    <section class="panel">
      <form class="card form-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div>
          <h2>Welcome back</h2>
          <p class="muted">Log in to view your portfolio</p>
        </div>

        @if (reason() === 'expired') {
          <div class="alert alert-warn">Your session expired. Please log in again.</div>
        }
        @if (error()) {
          <div class="alert alert-error" role="alert">{{ error() }}</div>
        }

        <div class="field">
          <label for="email">Email</label>
          <input id="email" class="input" type="email" formControlName="email" autocomplete="username" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <span class="error">Enter a valid email address</span>
          }
        </div>

        <div class="field">
          <label for="password">Password</label>
          <div class="pw">
            <input
              id="password"
              class="input"
              [type]="showPw() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
            />
            <button type="button" class="btn btn-ghost btn-sm toggle" (click)="showPw.set(!showPw())">
              {{ showPw() ? 'Hide' : 'Show' }}
            </button>
          </div>
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <span class="error">Password is required</span>
          }
        </div>

        <button class="btn btn-primary btn-block" type="submit" [disabled]="loading()">
          {{ loading() ? 'Logging in…' : 'Log in' }}
        </button>

        <div class="alert alert-info">
          Demo account: <b>demo&#64;tradesmart.in</b> / <b>Demo&#64;1234</b>
          <button type="button" class="btn btn-ghost btn-sm" (click)="fillDemo()">Use demo</button>
        </div>

        <p class="hint">New investor? <a routerLink="/register">Open an account</a></p>
      </form>
    </section>
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  /** Bound from query params via withComponentInputBinding(). */
  returnUrl = input<string>();
  reason = input<string>();

  protected form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected loading = signal(false);
  protected error = signal('');
  protected showPw = signal(false);

  fillDemo() {
    this.form.setValue({ email: 'demo@tradesmart.in', password: 'Demo@1234' });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl(this.safeReturnUrl()),
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  /** Only allow in-app paths to avoid open-redirects. */
  private safeReturnUrl() {
    const url = this.returnUrl();
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/dashboard';
  }
}
