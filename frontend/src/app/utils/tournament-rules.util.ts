import {
  ChampionShipTournamentConfig,
  StructuredTournamentConfig,
  TournamentConfigurationDetailsDto,
  UpDownTournamentConfig,
} from 'src/app/models/tournament-configuration-detail.model';
import { RulePill } from 'src/app/shared/rule-pills/rule-pills';
import { scoreCalculationOptions } from 'src/app/shared/tournament-configuration/tournament-create.data';

export type TournamentRule = RulePill;

/**
 * The tournament settings summed up as a row of pills: every mode choice (default included), and
 * the options that are switched on.
 */
export function buildTournamentRules(
  configuration: TournamentConfigurationDetailsDto | null | undefined,
): TournamentRule[] {
  if (!configuration) {
    return [];
  }

  const scoreCalculation = scoreCalculationOptions.find(
    (option) => option.value === configuration.scoreCalculation,
  );

  const rules: TournamentRule[] = [
    { icon: 'flag', label: `${configuration.pointsPerGame} points` },
  ];
  if (scoreCalculation) {
    rules.push({ icon: scoreCalculation.icon, label: scoreCalculation.label });
  }

  rules.push(...buildModeRules(configuration));

  if (configuration.rematch) {
    rules.push({ icon: 'replay', label: 'Rematch autorisés' });
  }
  if (configuration.matchAgainstFullSameClub) {
    rules.push({ icon: 'shield', label: 'Matchs entre équipes du même club' });
  }
  if (configuration.matchAgainstPartialSameClub) {
    rules.push({ icon: 'shield_person', label: 'Matchs entre membres du même club' });
  }

  return rules;
}

function buildModeRules(configuration: TournamentConfigurationDetailsDto): TournamentRule[] {
  switch (configuration.competitionMode) {
    case 'standard':
      return buildStructuredRules(
        configuration.competitionConfiguration as StructuredTournamentConfig,
      );
    case 'up_down':
      return buildUpDownRules(configuration.competitionConfiguration as UpDownTournamentConfig);
    case 'championship':
      return buildChampionshipRules(
        configuration.competitionConfiguration as ChampionShipTournamentConfig,
      );
    default:
      return [];
  }
}

function buildStructuredRules(config: StructuredTournamentConfig): TournamentRule[] {
  const rules: TournamentRule[] = [];

  if (config.numberOfQualifyingRounds) {
    rules.push({
      icon: 'format_list_numbered',
      label: `${config.numberOfQualifyingRounds} parties qualificatives`,
    });
  }
  if (config.consolationCount) {
    rules.push({
      icon: 'account_tree',
      label:
        config.consolationCount > 1 ? `${config.consolationCount} consolantes` : '1 consolante',
    });
  }
  if (config.hasChallenges) {
    rules.push({ icon: 'account_tree', label: 'Challenges' });
  }
  if (config.hasThirdPlaceMatch) {
    rules.push({ icon: 'military_tech', label: 'Match pour la 3e place' });
  }
  // Absent on the tournaments created before the choice: the backend places them pyramidally.
  rules.push(
    (config.eliminationSeeding ?? 'pyramidal') === 'random'
      ? { icon: 'shuffle', label: 'Élimination : placement aléatoire' }
      : { icon: 'account_tree', label: 'Élimination : placement pyramidal' },
  );

  return rules;
}

function buildUpDownRules(config: UpDownTournamentConfig): TournamentRule[] {
  const rules: TournamentRule[] = [
    config.numberOfRound
      ? { icon: 'format_list_numbered', label: `${config.numberOfRound} parties` }
      : { icon: 'all_inclusive', label: 'Parties illimitées' },
  ];
  // Absent on the tournaments created before the choice: the backend pairs them at random.
  switch (config.pairingMode ?? 'random') {
    case 'dutch':
      rules.push({ icon: 'account_tree', label: 'Gagnant/Perdant' });
      break;
    case 'neighbors':
      rules.push({ icon: 'leaderboard', label: 'Voisins de classement' });
      break;
    case 'random':
      rules.push({ icon: 'shuffle', label: 'Appariement aléatoire' });
      break;
  }
  if (config.lastRoundByRanking) {
    rules.push({ icon: 'leaderboard', label: 'Dernière partie figée' });
  }
  return rules;
}

function buildChampionshipRules(config: ChampionShipTournamentConfig): TournamentRule[] {
  return config.homeClub && config.awayClub
    ? [{ icon: 'sports', label: `${config.homeClub} contre ${config.awayClub}` }]
    : [];
}
