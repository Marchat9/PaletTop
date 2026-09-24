import { PlayerMatchResult, PlayerMatchView } from 'src/app/models/player-match-view.model';
import { Nullable } from 'src/app/models/nullable.model';
import { TrainingMatchDto, TrainingTeamDto } from 'src/app/store/training/training.models';

/** Une équipe éphémère n'a pas de nom : on la désigne par ses joueurs. */
export function teamLabel(team: Nullable<TrainingTeamDto>): string {
  if (!team) {
    return '—';
  }
  return team.name || team.members.map((member) => member.name).join(' · ');
}

export function isInTeam(team: Nullable<TrainingTeamDto>, participantId: string): boolean {
  return (team?.members ?? []).some((member) => member.id === participantId);
}

/** L'équipe du participant sur ce match, pour en lister les coéquipiers. */
export function myTeam(
  match: Nullable<TrainingMatchDto>,
  participantId: string,
): Nullable<TrainingTeamDto> {
  if (!match) {
    return null;
  }
  if (isInTeam(match.teamA, participantId)) {
    return match.teamA;
  }
  return isInTeam(match.teamB, participantId) ? match.teamB : null;
}

/**
 * Projette le match d'entraînement vers la vue partagée. Le camp du participant se déduit de
 * son appartenance à l'une des deux équipes — il n'y a pas d'identifiant d'équipe stable d'un
 * round à l'autre.
 */
export function toPlayerMatchView(
  match: TrainingMatchDto,
  participantId: string,
  roundNumber: Nullable<number>,
): PlayerMatchView {
  const iAmTeamA = isInTeam(match.teamA, participantId);

  return {
    id: match.id,
    status: match.status,
    isBye: match.isBye,
    myLabel: teamLabel(iAmTeamA ? match.teamA : match.teamB),
    opponentLabel: teamLabel(iAmTeamA ? match.teamB : match.teamA),
    myScore: iAmTeamA ? match.scoreA : match.scoreB,
    opponentScore: iAmTeamA ? match.scoreB : match.scoreA,
    iAmTeamA,
    startedAt: match.startedAt ?? null,
    finishedAt: match.finishedAt ?? null,
    subtitle: roundNumber ? `Round ${roundNumber}` : null,
  };
}

/**
 * L'historique arrive en matchs bruts : on le replie du point de vue du participant. Les rounds
 * passés au repos y figurent, sans score.
 */
export function historyToResults(
  history: TrainingMatchDto[],
  participantId: string,
): PlayerMatchResult[] {
  return history.map((match, index) => {
    const iAmTeamA = isInTeam(match.teamA, participantId);

    return {
      id: match.id,
      label: `Match ${index + 1}`,
      status: match.status,
      myScore: iAmTeamA ? match.scoreA : match.scoreB,
      opponentLabel: teamLabel(iAmTeamA ? match.teamB : match.teamA),
      opponentScore: iAmTeamA ? match.scoreB : match.scoreA,
      isBye: match.isBye,
    };
  });
}
