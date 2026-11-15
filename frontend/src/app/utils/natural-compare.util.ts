const NATURAL_COLLATOR = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });

/**
 * Natural order for display names: digit runs compare as numbers (« Équipe 2 » before
 * « Équipe 11 »), case and accents are ignored.
 */
export function compareNatural(a: string, b: string): number {
  return NATURAL_COLLATOR.compare(a, b);
}
