import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AuthHero } from './auth-hero';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthHero],
  styleUrl: './auth-layout.scss',
  template: `
    <app-auth-hero />
    <section class="panel">
      <form class="card form-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div>
          <h2>Open your account</h2>
          <p class="muted">Takes less than a minute</p>
        </div>

        @if (error()) {
          <div class="alert alert-error" role="alert">{{ error() }}</div>
        }

        <div class="field">
          <label for="name">Full name</label>
          <input id="name" class="input" formControlName="name" autocomplete="name" />
          @if (invalid('name')) {
            <span class="error">Enter your full name</span>
          }
        </div>

        <div class="field">
          <label for="email">Email</label>
          <input id="email" class="input" type="email" formControlName="email" autocomplete="email" />
          @if (invalid('email')) {
            <span class="error">Enter a valid email address</span>
          }
        </div>

        <div class="field">
          <label for="mobile">Mobile number</label>
          <input
            id="mobile"
            class="input"
            type="tel"
            inputmode="numeric"
            maxlength="10"
            placeholder="10-digit number"
            formControlName="mobile"
            autocomplete="tel-national"
          />
          @if (invalid('mobile')) {
            <span class="error">Enter a valid 10-digit Indian mobile number</span>
          }
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input id="password" class="input" type="password" formControlName="password" autocomplete="new-password" />
          @if (invalid('password')) {
            <span class="error">At least 8 characters, with a letter and a number</span>
          }
        </div>

        <button class="btn btn-primary btn-block" type="submit" [disabled]="loading()">
          {{ loading() ? 'Creating account…' : 'Create account' }}
        </button>

        <p class="hint">Already have an account? <a routerLink="/login">Log in</a></p>
      </form>
    </section>
  `,
})
export class RegisterPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
  });
  protected loading = signal(false);
  protected error = signal('');

  protected invalid(name: keyof typeof this.form.controls) {
    const c = this.form.controls[name];
    return c.touched && c.invalid;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
}
