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
 * Projette le match du tournoi vers la vue partagée : l'équipe du joueur devient « mon camp »,
 * et le numéro de plaque sert de sous-titre — sauf en cas d'exemption, où le round situe mieux.
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
