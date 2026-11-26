import {
  PairingMode,
  ScoreCalculation,
} from 'src/app/models/tournament-configuration-detail.model';

export const competitionModeOptions: {
  value: string;
  icon: string;
  label: string;
  description: string;
}[] = [
  {
    value: 'standard',
    icon: 'social_leaderboard',
    label: 'Tournoi structuré',
    description: 'Phase de qualification et/ou phases finales à élimination directe',
  },
  {
    value: 'up_down',
    icon: 'swap_vert',
    label: 'Montantes / Descendantes',
    description: 'Classement par accumulation de points à chaque partie',
  },
  {
    value: 'championship',
    icon: 'emoji_events',
    label: 'Championnat',
    description: 'Affrontement de 2 clubs ayant chacun 4 équipes',
  },
];

const LAST_GAMES_GAP_CRITERION =
  "Écart de la dernière partie, puis de l'avant-dernière, et ainsi de suite";

const TIE_RULE =
  'Sur une rare égalité parfaite sur tous les critères, les équipes sont départagées par tirage au sort neutre.';

// Numbered criteria and the tie rule, shown under the name of a calculation.
function criteriaHtml(criteria: string[]): string {
  const items = criteria.map((criterion) => `<li>${criterion}</li>`).join('');
  return `<ol>${items}</ol><p class="note tie-rule">${TIE_RULE}</p>`;
}

export const scoreCalculationOptions: {
  value: ScoreCalculation;
  label: string;
  icon: string;
  description: string;
  htmlDescription?: string;
}[] = [
  {
    value: 'victory_goal_average',
    icon: 'calculate',
    label: 'Victoires & Goal Average',
    description: 'Les victoires d’abord, puis l’écart de points sur tout le tournoi',
    htmlDescription: criteriaHtml([
      'Victoires',
      'Goal average',
      'Points marqués',
      LAST_GAMES_GAP_CRITERION,
    ]),
  },
  {
    value: 'victory_best_defeats',
    icon: 'military_tech',
    label: 'Victoires & Meilleure défaite',
    description: 'Les victoires d’abord, puis la défaite la moins lourde',
    htmlDescription: criteriaHtml([
      'Victoires',
      'Meilleure défaite',
      'Goal average',
      'Points marqués',
      LAST_GAMES_GAP_CRITERION,
    ]),
  },
  {
    value: 'victory_points_scored',
    icon: 'sports_score',
    label: 'Victoires & Points marqués',
    description: 'Les victoires d’abord, puis le total de points marqués',
    htmlDescription: criteriaHtml([
      'Victoires',
      'Points marqués',
      'Moins de points encaissés',
      LAST_GAMES_GAP_CRITERION,
    ]),
  },
  {
    value: 'tournament_score',
    icon: 'workspace_premium',
    label: 'Points championnat',
    description: 'Règles spécifiques au championnat',
    htmlDescription: `
      <div class="flex">
        <span>0-2 = 0pt</span>
        <span>3-5 = 1pt</span>
        <span>6-8 = 2pts</span>
        <span>9-10 = 3pts</span>
        <span>11-12 = 4pts</span>
        <span>Victoire = 6pts</span>
      </div>
    `,
  },
];

export const pairingModeOptions: {
  value: PairingMode;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: 'dutch',
    icon: 'account_tree',
    label: 'Gagnant/Perdant',
    description:
      '1re partie tirée au sort. Ensuite, les équipes qui ont le même nombre de victoires se rencontrent : la moitié haute du groupe joue la moitié basse. Les meilleures équipes se retrouvent en fin de tournoi.',
  },
  {
    value: 'neighbors',
    icon: 'leaderboard',
    label: 'Voisins de classement',
    description:
      '1re partie tirée au sort. Ensuite, 1er contre 2e, 3e contre 4e… selon le classement du moment. Les contraintes (revanche, même club) sont respectées autant que possible, mais peuvent être contournées pour garder des voisins de classement.',
  },
  {
    value: 'random',
    icon: 'shuffle',
    label: 'Aléatoire',
    description:
      'Chaque partie est tirée au sort, en respectant les règles de tirage (clubs, revanches).',
  },
];

export const eliminationPairingModeOptions: {
  value: PairingMode;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: 'random',
    icon: 'shuffle',
    label: 'Tirage au sort',
    description:
      'Dans chaque tableau, les équipes sont tirées au sort à chaque tour, en respectant les règles de tirage (clubs, revanches).',
  },
  {
    value: 'dutch',
    icon: 'account_tree',
    label: 'Système suisse (version hollandaise)',
    description:
      'À chaque tour, les équipes encore en lice sont classées selon tous les matchs déjà joués : la moitié haute joue la moitié basse (1re contre 5e, 2e contre 6e… pour 8 équipes).',
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
    description: 'Pour les perdants du 2e tour du tableau Principal',
  },
  {
    value: 'challenge_consolante',
    label: 'Challenge Consolante',
    description: 'Pour les perdants du 1er tour du la Consolante',
  },
];
