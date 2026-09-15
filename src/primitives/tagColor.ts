/**
 * Deterministic tag → colour, in the spirit of Pokémon type pills.
 *
 * A tag is hashed to one slot in a fixed palette: a hue from {@link HUES} and a
 * tone from {@link TONES}. Picking from a curated set rather than the full hue
 * circle is the point — two tags either look clearly different or share a
 * colour outright, and never land a few degrees apart looking almost-but-not
 * quite the same. The label is the complementary hue, kept vivid, with a thin
 * contrasting {@link TagColor.outline} carrying legibility so it doesn't have
 * to fall back on washed-out near-white / near-black.
 */

// Hues spaced to stay distinguishable at the tones below. 14 × 2 tones = 28 chips.
const HUES = [0, 25, 45, 65, 90, 130, 160, 180, 200, 225, 255, 280, 310, 335];

// [saturation, lightness]. Bright echoes the theme's lime accent (~hsl(80 92% 59%));
// deep is the same hue read as a jewel tone, so siblings never blur together.
const TONES: [number, number][] = [
  [68, 62],
  [72, 44],
];

// Label: complementary hue, fully saturated. Two vivid candidates — a deep tone
// and a bright tone — and we keep whichever contrasts more with the fill.
const LABEL_SATURATION = 100;
const LABEL_DEEP_LIGHTNESS = 22;
const LABEL_BRIGHT_LIGHTNESS = 72;

/** Stable string hash (djb2-ish accumulate + murmur3 avalanche). */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // keep it a 32-bit int
  }
  // djb2 barely mixes its low bits, so short similar-length tags ("pop", "r&b",
  // "funk") land next to each other once you take a remainder. Avalanche first.
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return (hash ^ (hash >>> 16)) >>> 0;
}

/** HSL (h∈[0,360), s/l∈[0,100]) → sRGB channels in [0,255]. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [255 * f(0), 255 * f(8), 255 * f(4)];
}

/** WCAG relative luminance of an sRGB colour. */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two luminances. */
function contrast(a: number, b: number): number {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

export interface TagColor {
  /** Pill fill colour. */
  bg: string;
  /** Label colour — the complement, at whichever vivid tone reads best on the fill. */
  fg: string;
  /** Thin halo behind the label, opposite the label's luminance, for legibility. */
  outline: string;
}

export function tagColor(tag: string): TagColor {
  const hash = hashString(tag.trim().toLowerCase());

  // Hue off the low bits, tone off the high ones — post-avalanche they're independent.
  const hue = HUES[hash % HUES.length];
  const [fillSaturation, fillLightness] = TONES[(hash >>> 28) % TONES.length];
  const fillLum = relativeLuminance(hslToRgb(hue, fillSaturation, fillLightness));

  const labelHue = (hue + 180) % 360;
  const deepLum = relativeLuminance(hslToRgb(labelHue, LABEL_SATURATION, LABEL_DEEP_LIGHTNESS));
  const brightLum = relativeLuminance(hslToRgb(labelHue, LABEL_SATURATION, LABEL_BRIGHT_LIGHTNESS));

  const useDeep = contrast(fillLum, deepLum) >= contrast(fillLum, brightLum);
  const labelLightness = useDeep ? LABEL_DEEP_LIGHTNESS : LABEL_BRIGHT_LIGHTNESS;

  return {
    bg: `hsl(${hue} ${fillSaturation}% ${fillLightness}%)`,
    fg: `hsl(${labelHue} ${LABEL_SATURATION}% ${labelLightness}%)`,
    // Deep labels get a light halo; bright labels get a dark one.
    outline: useDeep ? 'rgba(255, 255, 255, 0.55)' : 'rgba(5, 22, 72, 0.6)',
  };
}
