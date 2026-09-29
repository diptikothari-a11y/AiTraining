import { Pipe, PipeTransform } from '@angular/core';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const qty = new Intl.NumberFormat('en-IN');

/** ₹1,23,456.78 — Indian digit grouping. */
export function formatInr(v: number | null | undefined): string {
  return v == null ? '—' : inr.format(v);
}

/** ₹1.25 Cr / ₹4.30 L / ₹56,789.00 — compact form for headline figures. */
export function formatInrCompact(v: number | null | undefined): string {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return inr.format(v);
}

@Pipe({ name: 'inr' })
export class InrPipe implements PipeTransform {
  transform(v: number | null | undefined, mode: 'full' | 'compact' | 'signed' = 'full'): string {
    if (mode === 'compact') return formatInrCompact(v);
    if (mode === 'signed' && v != null) return (v > 0 ? '+' : '') + formatInr(v);
    return formatInr(v);
  }
}

@Pipe({ name: 'pct' })
export class PctPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    if (v == null) return '—';
    return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
  }
}

@Pipe({ name: 'qty' })
export class QtyPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    return v == null ? '—' : qty.format(v);
  }
}

/** CSS class for a signed amount: 'profit' | 'loss' | ''. */
export function tone(v: number | null | undefined): string {
  return !v ? '' : v > 0 ? 'profit' : 'loss';
}

@Pipe({ name: 'tone' })
export class TonePipe implements PipeTransform {
  transform = tone;
}
