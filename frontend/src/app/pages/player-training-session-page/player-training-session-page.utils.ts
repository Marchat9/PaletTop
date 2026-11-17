import { PlayerMatchResult, PlayerMatchView } from 'src/app/models/player-match-view.model';
import { Nullable } from 'src/app/models/nullable.model';
import { TrainingMatchDto, TrainingTeamDto } from 'src/app/store/training/training.models';
import { isInTeam, teamLabel } from 'src/app/utils/training-team.util';

/** The team of the participant in this match, to list their team-mates. */
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

/** Where to play first (« Plaque N°2 »), then the round; a bye has no plate. */
function matchSubtitle(match: TrainingMatchDto, roundNumber: Nullable<number>): Nullable<string> {
  const round = roundNumber ? `Round ${roundNumber}` : null;
  if (match.isBye || !match.plateNumber) {
    return round;
  }
  const plate = `Plaque N°${match.plateNumber}`;
  return round ? `${plate} · ${round}` : plate;
}

/**
 * Projects the training match into the shared view. The side of the participant is deduced from
 * their belonging to one of the two teams - there is no stable team id from one round to the next.
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
    subtitle: matchSubtitle(match, roundNumber),
  };
}

/**
 * History arrives as raw matches: it is folded back to the participant's point of view. Rounds
 * spent resting appear in it, without a score.
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
      // The partners change at every round: the page-wide label could only name the player.
      myLabel: teamLabel(iAmTeamA ? match.teamA : match.teamB),
      myScore: iAmTeamA ? match.scoreA : match.scoreB,
      opponentLabel: teamLabel(iAmTeamA ? match.teamB : match.teamA),
      opponentScore: iAmTeamA ? match.scoreB : match.scoreA,
      isBye: match.isBye,
    };
  });
}
