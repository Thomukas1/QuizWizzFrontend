/**
 * Lyrics are written a line at a time. The page is a fixed run of one-line
 * fields — every one of them there from the start, each its own input you can
 * click straight into. A line holds at most `LINE_MAX` characters and simply
 * stops taking them; getting to the next line is Enter (or Tab, or a tap),
 * never an overflow that happens to you.
 *
 * That's the whole model. Nothing reflows, nothing re-wraps under the cursor,
 * and a line is a real thing with an index — which is what makes lines worth
 * building on later.
 *
 * This module is the page's arithmetic: the operations that move text between
 * lines (split on Enter, merge on Backspace, spread a paste across several) as
 * pure functions on a `string[]`. The component owns focus and the caret.
 */

/** Characters per line. */
export const LINE_MAX = 34;

/** Lines on a page — all of them drawn, whether or not they're written on. */
export const MAX_LINES = 20;

/** Where an edit left the caret: which line, and how far into it. */
export interface Spot {
  line: number;
  caret: number;
}

export interface PageEdit {
  page: string[];
  spot: Spot;
}

export function blankPage(): string[] {
  return Array.from({ length: MAX_LINES }, () => '');
}

/**
 * Characters actually written, breaks excluded. The whole budget: the backend
 * counts content the same way, so this compares straight to its limit and one
 * character typed is one character spent, start to finish.
 */
export function contentLength(page: string[]): number {
  let n = 0;
  for (const line of page) n += line.length;
  return n;
}

/**
 * The submitted text. Trailing blank lines are dropped — they're page furniture,
 * not silence anyone asked for — but blank lines *between* written ones are
 * kept, since that's someone deliberately leaving a gap.
 */
export function pageToText(page: string[]): string {
  let end = page.length;
  while (end > 0 && page[end - 1].trim() === '') end -= 1;
  return page.slice(0, end).join('\n');
}

/** Break arbitrary text into page-shaped lines, for a paste. */
export function textToLines(text: string): string[] {
  const out: string[] = [];
  for (const para of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (para.length <= LINE_MAX) {
      out.push(para);
      continue;
    }
    // Only pasted text ever needs wrapping, and it's a one-off: the writer sees
    // the result as ordinary lines they can then edit by hand.
    let rest = para;
    while (rest.length > LINE_MAX) {
      const cut = rest.lastIndexOf(' ', LINE_MAX);
      const at = cut > 0 ? cut : LINE_MAX;
      out.push(rest.slice(0, at));
      rest = rest.slice(cut > 0 ? at + 1 : at);
    }
    if (rest) out.push(rest);
  }
  return out;
}

/** Trim to the page's height, keeping it exactly MAX_LINES long. */
function toPage(lines: string[]): string[] {
  const page = lines.slice(0, MAX_LINES);
  while (page.length < MAX_LINES) page.push('');
  return page;
}

/**
 * Enter: end the line here and carry whatever followed the caret down with you.
 * Lines below shift down; anything pushed off the last line is refused rather
 * than silently dropped, so the page can't quietly eat a line.
 */
export function splitLine(page: string[], line: number, caret: number): PageEdit | null {
  if (page[MAX_LINES - 1].trim() !== '') return null;
  const head = page[line].slice(0, caret);
  const tail = page[line].slice(caret);
  const next = [...page.slice(0, line), head, tail, ...page.slice(line + 1)];
  return { page: toPage(next), spot: { line: line + 1, caret: 0 } };
}

/**
 * Backspace at the head of a line: fold it up into the one above, landing the
 * caret at the seam. If the two won't fit in one line, the text stays put and
 * only the caret moves up — losing characters to a keystroke that reads as
 * "go back" would be its own kind of broken.
 */
export function mergeUp(page: string[], line: number): PageEdit | null {
  if (line === 0) return null;
  const above = page[line - 1];
  const here = page[line];
  if (above.length + here.length > LINE_MAX) {
    return { page, spot: { line: line - 1, caret: above.length } };
  }
  const next = [...page.slice(0, line - 1), above + here, ...page.slice(line + 1)];
  return { page: toPage(next), spot: { line: line - 1, caret: above.length } };
}

/**
 * Paste: spread the incoming text across lines from the caret, pushing what was
 * already there down. The tail of the current line rejoins after the last
 * pasted line, so pasting into the middle of a line behaves like typing it.
 */
export function pasteAt(page: string[], line: number, caret: number, text: string): PageEdit {
  const head = page[line].slice(0, caret);
  const tail = page[line].slice(caret);
  const chunks = textToLines(text);
  if (chunks.length === 0) return { page, spot: { line, caret } };

  const merged = [...chunks];
  merged[0] = (head + merged[0]).slice(0, LINE_MAX);
  const landing = merged.length - 1;
  const landingCaret = merged[landing].length;
  merged[landing] = (merged[landing] + tail).slice(0, LINE_MAX);

  const next = [...page.slice(0, line), ...merged, ...page.slice(line + 1)];
  return {
    page: toPage(next),
    spot: { line: Math.min(line + landing, MAX_LINES - 1), caret: landingCaret },
  };
}
