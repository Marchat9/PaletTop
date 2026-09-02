import {
  CompetitionMode,
  SpecificTournamentConfig,
  TournamentConfigurationDetailsDto,
} from '../models/tournament-configuration-detail.model';
import { TournamentConfigurationDto } from '../models/tournament-configuration.model';
import { TournamentConfigurationForm } from '../shared/tournament-configuration/tournament-configuration-form.model';
import { TournamentModeParameterForm } from '../shared/tournament-configuration/tournament-mode-parameter/tournament-mode-parameter-form.model';

export function convertTournamentFormToTournamentConfigurationDto(
  tournamentForm: TournamentConfigurationForm,
): TournamentConfigurationDto {
  return {
    name: tournamentForm.controls.parameters.controls.name.value,
    code: tournamentForm.controls.parameters.controls.code.value,
    adminPassword: tournamentForm.controls.parameters.controls.adminPassword.value,
    date: tournamentForm.controls.parameters.controls.date.value,
    description: tournamentForm.controls.parameters.controls.description.value ?? '',

    configuration: convertToTournamentConfigurationDetailsDto(tournamentForm),
  };
}

export function convertToTournamentConfigurationDetailsDto(
  tournamentForm: TournamentConfigurationForm,
): TournamentConfigurationDetailsDto {
  const rulesControls = tournamentForm.controls.rules.controls;
  const modeParameterControls = tournamentForm.controls.modeParameter.controls;

  return {
    maxTeamCapacity: rulesControls.maxTeamCapacity.value,
    scoreCalculation: rulesControls.scoreCalculation.value,
    pointsPerGame: rulesControls.pointsPerGame.value,
    rematch: rulesControls.rematch.value,
    matchAgainstFullSameClub: rulesControls.matchAgainstFullSameClub.value,
    matchAgainstPartialSameClub: rulesControls.matchAgainstPartialSameClub.value,
    competitionMode: modeParameterControls.competitionMode.value,

    competitionConfiguration: extractCompetitionConfiguration(
      tournamentForm.controls.modeParameter,
    ),
  };
}

export function extractCompetitionConfiguration(
  tournamentModeParameter: TournamentModeParameterForm,
): SpecificTournamentConfig {
  const mode: CompetitionMode = tournamentModeParameter.controls.competitionMode.value;

  switch (mode) {
    case 'standard':
      const structuredConfigControls = tournamentModeParameter.controls.structuredMode.controls;
      return {
        hasConsolanteTable: structuredConfigControls.hasConsolanteTable.value,
        hasChallengePrincipaleTable: structuredConfigControls.hasChallengePrincipaleTable.value,
        hasChallengeConsolanteTable: structuredConfigControls.hasChallengeConsolanteTable.value,
        hasThirdPlaceMatch: structuredConfigControls.hasThirdPlaceMatch.value,
        principalBracketSize: structuredConfigControls.principalBracketSize.value,
        numberOfQualifyingRounds: structuredConfigControls.numberOfQualifyingRounds.value,
        numberOfPools: structuredConfigControls.numberOfPools.value,
      };
    case 'up_down':
      const upDownConfigControls = tournamentModeParameter.controls.upDownMode.controls;
      return {
        numberOfRound: upDownConfigControls.numberOfRound.value,
      };
    case 'championship':
      const championshipConfigControls = tournamentModeParameter.controls.championshipMode.controls;
      return {
        homeClub: championshipConfigControls.homeTeam.value,
        awayClub: championshipConfigControls.awayTeam.value,
      };
    default:
      return {};
  }
}
