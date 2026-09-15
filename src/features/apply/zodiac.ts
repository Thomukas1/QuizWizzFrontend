import type { DropdownOption } from '../../primitives/form';

// Zodiac signs are a fixed, universal set, so their emoji live here as static
// presentation data rather than coming from the backend (which sends names
// only). Keys must match the backend's strings exactly (zodiacSelection.json).
const ZODIAC_EMOJI: Record<string, string> = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpio: '♏',
  Sagittarius: '♐',
  Capricorn: '♑',
  Aquarius: '♒',
  Pisces: '♓',
};

// Turn the backend's plain name list into emoji-decorated dropdown options.
// Unknown names fall through without an emoji rather than breaking.
export const toZodiacOptions = (signs: string[]): DropdownOption[] =>
  signs.map(value => ({ value, emoji: ZODIAC_EMOJI[value] }));
