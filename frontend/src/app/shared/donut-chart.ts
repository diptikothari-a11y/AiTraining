import { Component, computed, input } from '@angular/core';

export interface DonutSlice {
  label: string;
  value: number;
}

const COLORS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5', '--chart-6', '--chart-7'];
const R = 42;
const C = 2 * Math.PI * R;

/** Dependency-free SVG donut. Slices beyond the palette size are grouped into "Others". */
@Component({
  selector: 'app-donut-chart',
  template: `
    <div class="wrap">
      <svg viewBox="0 0 100 100" role="img" [attr.aria-label]="ariaLabel()">
        <circle cx="50" cy="50" [attr.r]="R" class="track" />
        @for (s of arcs(); track s.label) {
          <circle
            cx="50"
            cy="50"
            [attr.r]="R"
            [attr.stroke]="s.color"
            [attr.stroke-dasharray]="s.dash"
            [attr.stroke-dashoffset]="s.offset"
          >
            <title>{{ s.label }}: {{ s.pct.toFixed(1) }}%</title>
          </circle>
        }
      </svg>
      <div class="center">
        <ng-content />
      </div>
    </div>
    <ul class="legend">
      @for (s of arcs(); track s.label) {
        <li>
          <span class="swatch" [style.background]="s.color"></span>
          <span class="lbl">{{ s.label }}</span>
          <span class="num">{{ s.pct.toFixed(1) }}%</span>
        </li>
      }
    </ul>
  `,
  styles: `
    :host { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 24px; align-items: center; }
    .wrap { position: relative; width: 180px; height: 180px; }
    svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    circle { fill: none; stroke-width: 12; }
    .track { stroke: var(--surface-2); }
    .center { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
    .legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    li { display: flex; align-items: center; gap: 10px; }
    .swatch { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
    .lbl { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media (max-width: 520px) { :host { grid-template-columns: minmax(0, 1fr); justify-items: center; } .legend { width: 100%; } }
  `,
})
export class DonutChart {
  slices = input.required<DonutSlice[]>();
  ariaLabel = input('Allocation chart');
  protected R = R;

  protected arcs = computed(() => {
    const sorted = [...this.slices()].filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
    const max = COLORS.length;
    const data =
      sorted.length > max
        ? [
            ...sorted.slice(0, max - 1),
            { label: 'Others', value: sorted.slice(max - 1).reduce((a, s) => a + s.value, 0) },
          ]
        : sorted;
    const total = data.reduce((a, s) => a + s.value, 0) || 1;
    const gap = data.length > 1 ? 0.8 : 0; // small visual gap between slices
    let acc = 0;
    return data.map((s, i) => {
      const len = (s.value / total) * C;
      const arc = {
        label: s.label,
        pct: (s.value / total) * 100,
        color: `var(${COLORS[i]})`,
        dash: `${Math.max(len - gap, 0)} ${C}`,
        offset: -acc,
      };
      acc += len;
      return arc;
    });
  });
}
