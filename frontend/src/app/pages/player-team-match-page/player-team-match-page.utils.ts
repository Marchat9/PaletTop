import { MatchHistoryDto } from 'src/app/models/player-match.model';
import { TeamResultView } from 'src/app/models/player-team-view';

export function historyToResults(history: MatchHistoryDto[]): TeamResultView[] {
  return history.map((entry) => ({
    id: entry.matchId,
    date: new Date(),
    sessionNumber: entry.sessionNumber,
    currentTeamScore: entry.teamScore,
    opponentTeamName: entry.opponentName,
    opponentScore: entry.opponentScore,
    status: 'VALIDATED',
  }));
}
