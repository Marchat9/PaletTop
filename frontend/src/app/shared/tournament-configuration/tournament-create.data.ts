import { ScoreCalculation } from 'src/app/models/tournament-configuration-detail.model';

export const competitionModeOptions: {
  value: string;
  icon: string;
  label: string;
  description: string;
}[] = [
  {
    value: 'standard',
    icon: 'emoji_events',
    label: 'Tournoi structuré',
    description: 'Phase de qualification et/ou phases finales à élimination directe',
  },
  {
    value: 'up_down',
    icon: 'swap_vert',
    label: 'Montantes / Descendantes',
    description: 'Classement par accumulation de points à chaque partie',
  },
];

export const scoreCalculationOptions: {
  value: ScoreCalculation;
  label: string;
  icon: string;
  description: string;
  htmlDescription?: string;
}[] = [
  {
    value: 'victory_ga',
    icon: 'calculate',
    label: 'Victoire & Goal Average',
    description: 'Nombre de victoire puis Goal Average',
  },
  {
    value: 'score',
    icon: 'swap_vert',
    label: 'Somme des scores',
    description: 'Scores de chaque manche additionnés',
  },
  {
    value: 'tournament_score',
    icon: 'workspace_premium',
    label: 'Points tournoi',
    description: 'Règles spécifiques au tournoi',
    htmlDescription: `
      <div class="flex">
        <span>0-2 = 0pt</span>
        <span>3-5 = 1pt</span>
        <span>6-8 = 2pts</span>
        <span>9-10 = 3pts</span>
        <span>11-12 = 5pts</span>
        <span>Victoire = 6pts</span>
      </div>
    `,
  },
];

export const pointsPerGameOptions: { value: number; label: string; description: string }[] = [
  { value: 11, label: '11 points', description: 'Partie terminée à 11 points' },
  { value: 12, label: '12 points', description: 'Partie terminée à 12 points' },
  { value: 13, label: '13 points', description: 'Partie terminée à 13 points' },
];

export const eliminationTableauxOptions: {
  value: string;
  label: string;
  description: string;
  disabled?: boolean;
}[] = [
  {
    value: 'principale',
    label: 'Tableau Principal',
    description: 'Toujours actif',
    disabled: true,
  },
  {
    value: 'consolante',
    label: 'Consolante',
    description: 'Pour les perdants du 1er tour du tableau Principal',
  },
  {
    value: 'challenge_principale',
    label: 'Challenge',
    description: 'Pour les perdants du 2eme tour du tableau Principal',
  },
  {
    value: 'challenge_consolante',
    label: 'Challenge Consolante',
    description: 'Pour les perdants du 1er tour du la Consolante',
  },
];
