import { formatInr, formatInrCompact, PctPipe, tone } from './format';

// Intl may use a narrow no-break space; normalise whitespace for comparisons.
const norm = (s: string) => s.replace(/\s/g, ' ');

describe('INR formatting', () => {
  it('uses Indian digit grouping (lakh/crore)', () => {
    expect(norm(formatInr(12345678.9))).toBe('₹1,23,45,678.90');
  });

  it('formats compact lakh and crore', () => {
    expect(formatInrCompact(250000)).toBe('₹2.50 L');
    expect(formatInrCompact(31500000)).toBe('₹3.15 Cr');
    expect(formatInrCompact(-450000)).toBe('-₹4.50 L');
    expect(norm(formatInrCompact(9999))).toBe('₹9,999.00');
  });

  it('handles missing values', () => {
    expect(formatInr(null)).toBe('—');
  });
});

describe('pct & tone', () => {
  it('signs percentages', () => {
    const p = new PctPipe();
    expect(p.transform(3.456)).toBe('+3.46%');
    expect(p.transform(-1.2)).toBe('-1.20%');
  });

  it('maps sign to colour class', () => {
    expect(tone(5)).toBe('profit');
    expect(tone(-5)).toBe('loss');
    expect(tone(0)).toBe('');
  });
});
