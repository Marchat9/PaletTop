import { MatchHistoryDto, PlayerMatchDto } from 'src/app/models/player-match.model';
import {
  PlayerMatchResult,
  PlayerMatchStatus,
  PlayerMatchView,
} from 'src/app/models/player-match-view.model';

export function historyToResults(history: MatchHistoryDto[]): PlayerMatchResult[] {
  return history.map((entry) => ({
    id: entry.matchId,
    label: `Match ${entry.sessionNumber}`,
    status: 'VALIDATED',
    myScore: entry.teamScore,
    opponentLabel: entry.opponentName,
    opponentScore: entry.opponentScore,
    isBye: entry.outcome === 'bye',
  }));
}

/**
 * Projects the tournament match into the shared view: the player's team becomes "my side", and the
 * plate number acts as the subtitle - except when exempt, where the round places it better.
 */
export function toPlayerMatchView(match: PlayerMatchDto, teamId: string): PlayerMatchView {
  const iAmTeamA = match.teamA.id === teamId;

  return {
    id: match.id,
    status: match.status as PlayerMatchStatus,
    isBye: match.isBye,
    myLabel: iAmTeamA ? match.teamA.name : (match.teamB?.name ?? '—'),
    opponentLabel: iAmTeamA ? (match.teamB?.name ?? '—') : match.teamA.name,
    myScore: iAmTeamA ? match.scoreA : match.scoreB,
    opponentScore: iAmTeamA ? match.scoreB : match.scoreA,
    iAmTeamA,
    startedAt: match.startedAt,
    finishedAt: match.finishedAt,
    subtitle: match.isBye
      ? `Round ${match.session.sessionNumber}`
      : `Plaque N°${match.plateNumber ?? '—'}`,
  };
}
