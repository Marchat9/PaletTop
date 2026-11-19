/** One position of a cron expression, explained. */
export interface CronFieldView {
  /** « Minute », « Heure »… */
  label: string;
  /** What was typed at this position, « — » when missing. */
  value: string;
  /** Plain French meaning: « chaque heure », « 3h », « lundi »… */
  meaning: string;
}

interface CronFieldDefinition {
  label: string;
  every: string;
  step: (n: string) => string;
  name: (value: string) => string;
}

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
const WEEK_DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function nameFrom(names: string[], offset: number): (value: string) => string {
  return (value) => {
    const index = Number(value) - offset;
    return Number.isInteger(index) && index >= 0 ? (names[index % names.length] ?? value) : value;
  };
}

const SECOND: CronFieldDefinition = {
  label: 'Seconde',
  every: 'chaque seconde',
  step: (n) => `toutes les ${n} secondes`,
  name: (v) => `${v} s`,
};

const FIELDS: CronFieldDefinition[] = [
  {
    label: 'Minute',
    every: 'chaque minute',
    step: (n) => `toutes les ${n} minutes`,
    name: (v) => `${v} min`,
  },
  {
    label: 'Heure',
    every: 'chaque heure',
    step: (n) => `toutes les ${n} heures`,
    name: (v) => `${v}h`,
  },
  {
    label: 'Jour du mois',
    every: 'chaque jour',
    step: (n) => `tous les ${n} jours`,
    name: (v) => `le ${v}`,
  },
  {
    label: 'Mois',
    every: 'chaque mois',
    step: (n) => `tous les ${n} mois`,
    name: nameFrom(MONTHS, 1),
  },
  {
    label: 'Jour de la semaine',
    every: 'tous les jours',
    step: (n) => `tous les ${n} jours`,
    name: nameFrom(WEEK_DAYS, 0),
  },
];

function describe(value: string, field: CronFieldDefinition): string {
  if (value === '*' || value === '?') {
    return field.every;
  }
  const step = /^\*\/(\d+)$/.exec(value);
  if (step) {
    return field.step(step[1]);
  }
  if (value.includes('/')) {
    return 'valeur avancée';
  }
  if (value.includes(',')) {
    return value
      .split(',')
      .map((part) => describe(part, field))
      .join(', ');
  }
  const range = /^(\w+)-(\w+)$/.exec(value);
  if (range) {
    return `de ${field.name(range[1])} à ${field.name(range[2])}`;
  }
  return field.name(value);
}

function splitCron(expression: string): string[] {
  return expression.trim().split(/\s+/).filter(Boolean);
}

/**
 * Each position of a cron expression with its meaning: 5 fields (minute hour day month weekday),
 * or 6 with the seconds first, as the backend accepts.
 */
export function explainCron(expression: string): CronFieldView[] {
  const parts = splitCron(expression);
  const definitions = parts.length === 6 ? [SECOND, ...FIELDS] : FIELDS;
  return definitions.map((field, i) => {
    const value = parts[i];
    return value === undefined
      ? { label: field.label, value: '—', meaning: 'manquant' }
      : { label: field.label, value, meaning: describe(value, field) };
  });
}

/** True when the expression has 5 or 6 fields (the content of each one is checked by the backend). */
export function hasCronFieldCount(expression: string): boolean {
  const count = splitCron(expression).length;
  return count === 5 || count === 6;
}
