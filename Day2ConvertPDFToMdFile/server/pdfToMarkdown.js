import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const BULLET_RE = /^\s*[•◦▪▫●○■□►▶‣⁃∙·\-*]\s+/;
const NUMBERED_RE = /^\s*(\d+|[a-zA-Z])[.)]\s+/;

/**
 * Convert a PDF buffer into Markdown.
 * Headings are inferred from font size relative to the dominant body size,
 * bullets/numbered lists are normalised, and wrapped lines are joined into paragraphs.
 */
export async function pdfToMarkdown(buffer) {
  const pdf = await getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;

  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    pages.push(groupIntoLines(content.items));
  }

  const bodySize = dominantFontSize(pages.flat());
  const blocks = [];
  for (const lines of pages) {
    blocks.push(...linesToBlocks(lines, bodySize));
  }

  await pdf.destroy();
  return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function groupIntoLines(items) {
  const lines = [];
  for (const item of items) {
    if (!item.str || !item.str.trim()) {
      if (item.hasEOL && lines.length) lines[lines.length - 1].eol = true;
      continue;
    }
    const [a, b, , , x, y] = item.transform;
    const size = Math.round(Math.hypot(a, b) * 10) / 10 || item.height;
    const fontName = item.fontName || '';
    const last = lines[lines.length - 1];

    if (last && !last.eol && Math.abs(last.y - y) < size * 0.5) {
      const gap = x - last.endX;
      const needsSpace = gap > size * 0.15 && !last.text.endsWith(' ') && !item.str.startsWith(' ');
      last.text += (needsSpace ? ' ' : '') + item.str;
      last.endX = x + item.width;
      last.size = Math.max(last.size, size);
      last.bold = last.bold && /bold|black|heavy/i.test(fontName);
    } else {
      lines.push({
        text: item.str,
        x,
        y,
        endX: x + item.width,
        size,
        bold: /bold|black|heavy/i.test(fontName),
        eol: false,
      });
    }
    if (item.hasEOL) lines[lines.length - 1].eol = true;
  }
  return lines.map((l) => ({ ...l, text: l.text.replace(/\s+/g, ' ').trim() })).filter((l) => l.text);
}

function dominantFontSize(lines) {
  const counts = new Map();
  for (const l of lines) counts.set(l.size, (counts.get(l.size) || 0) + l.text.length);
  let best = 12;
  let max = -1;
  for (const [size, n] of counts) {
    if (n > max) {
      max = n;
      best = size;
    }
  }
  return best;
}

function headingLevel(line, bodySize) {
  const ratio = line.size / bodySize;
  if (line.text.length > 120) return 0;
  if (ratio >= 1.8) return 1;
  if (ratio >= 1.4) return 2;
  if (ratio >= 1.15) return 3;
  if (line.bold && line.text.length < 80 && !/[.:,;]$/.test(line.text)) return 4;
  return 0;
}

function linesToBlocks(lines, bodySize) {
  const blocks = [];
  let para = null; // { kind: 'p' | 'li', text, prevY }
  let lastHeading = null; // { level, y, size } of the block just emitted, if it was a heading

  const flush = () => {
    if (para) blocks.push(para.text);
    para = null;
  };

  for (const line of lines) {
    const level = headingLevel(line, bodySize);
    if (level) {
      flush();
      // a heading that wraps onto a second line at the same size stays one heading
      const continues =
        lastHeading &&
        lastHeading.level === level &&
        lastHeading.size === line.size &&
        Math.abs(lastHeading.y - line.y) < line.size * 1.6;
      if (continues) blocks[blocks.length - 1] += ' ' + escapeMd(line.text);
      else blocks.push(`${'#'.repeat(level)} ${escapeMd(line.text)}`);
      lastHeading = { level, y: line.y, size: line.size };
      continue;
    }
    lastHeading = null;

    const bullet = BULLET_RE.test(line.text);
    const numbered = NUMBERED_RE.test(line.text);
    const lineGap = para ? Math.abs(para.prevY - line.y) : 0;
    const bigGap = para && lineGap > line.size * 1.8;

    if (bullet || numbered) {
      flush();
      const text = bullet
        ? '- ' + escapeMd(line.text.replace(BULLET_RE, ''))
        : line.text.replace(NUMBERED_RE, (m, n) => `${n}. `);
      para = { kind: 'li', text, prevY: line.y };
      continue;
    }

    if (para && !bigGap) {
      // continuation of a wrapped line: join, handling hyphenation
      if (para.text.endsWith('-') && /^[a-z]/.test(line.text)) {
        para.text = para.text.slice(0, -1) + escapeMd(line.text);
      } else {
        para.text += ' ' + escapeMd(line.text);
      }
      para.prevY = line.y;
    } else {
      flush();
      para = { kind: 'p', text: escapeMd(line.text), prevY: line.y };
    }
  }
  flush();

  // list items should sit on consecutive lines, not separated by blank lines
  const merged = [];
  for (const b of blocks) {
    const prev = merged[merged.length - 1];
    if (prev && isListItem(prev) && isListItem(b)) merged[merged.length - 1] = prev + '\n' + b;
    else merged.push(b);
  }
  return merged;
}

function isListItem(text) {
  const lastLine = text.split('\n').pop();
  return /^(- |\d+\. |[a-zA-Z]\. )/.test(lastLine) && /^(- |\d+\. |[a-zA-Z]\. )/.test(text);
}

function escapeMd(text) {
  // Avoid accidental markdown formatting from raw PDF text
  return text.replace(/([\\`*_])/g, '\\$1');
}
