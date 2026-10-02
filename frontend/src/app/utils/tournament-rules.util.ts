import {
  ChampionShipTournamentConfig,
  StructuredTournamentConfig,
  TournamentConfigurationDetailsDto,
  UpDownTournamentConfig,
} from 'src/app/models/tournament-configuration-detail.model';
import { RulePill } from 'src/app/shared/rule-pills/rule-pills';
import { scoreCalculationOptions } from 'src/app/shared/tournament-configuration/tournament-create.data';

export type TournamentRule = RulePill;

/** The tournament settings that are switched on, summed up as a row of pills. */
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
  if ((config.numberOfPools ?? 0) > 1) {
    rules.push({ icon: 'workspaces', label: `${config.numberOfPools} poules` });
  }
  if (config.principalBracketSize) {
    rules.push({
      icon: 'account_tree',
      label: `Tableau principal : ${config.principalBracketSize} équipes`,
    });
  }
  if (config.hasConsolanteTable) {
    rules.push({ icon: 'account_tree', label: 'Consolante' });
  }
  if (config.hasChallengePrincipaleTable) {
    rules.push({ icon: 'account_tree', label: 'Challenge principale' });
  }
  if (config.hasChallengeConsolanteTable) {
    rules.push({ icon: 'account_tree', label: 'Challenge consolante' });
  }
  if (config.hasThirdPlaceMatch) {
    rules.push({ icon: 'military_tech', label: 'Match pour la 3e place' });
  }

  return rules;
}

function buildUpDownRules(config: UpDownTournamentConfig): TournamentRule[] {
  const rules: TournamentRule[] = [
    config.numberOfRound
      ? { icon: 'format_list_numbered', label: `${config.numberOfRound} parties` }
      : { icon: 'all_inclusive', label: 'Parties illimitées' },
  ];
  if (config.lastRoundByRanking) {
    rules.push({ icon: 'leaderboard', label: 'Dernière partie au classement' });
  }
  return rules;
}

function buildChampionshipRules(config: ChampionShipTournamentConfig): TournamentRule[] {
  return config.homeClub && config.awayClub
    ? [{ icon: 'sports', label: `${config.homeClub} contre ${config.awayClub}` }]
    : [];
}
