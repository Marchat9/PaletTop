import { TournamentMatch } from 'src/entities/tounament-match.entity';

export interface MatchHistoryDto {
    matchId: string;
    sessionNumber: number;
    teamName: string;
    teamScore: number;
    opponentName: string;
    opponentScore: number;
    outcome: 'win' | 'draw' | 'loss' | 'bye';
}

export function toMatchHistoryDto(match: TournamentMatch, teamId: string): MatchHistoryDto {
    const isTeamA = match.teamA.id === teamId;
    const teamName = isTeamA ? match.teamA.name : match.teamB!.name;
    const teamScore = isTeamA ? match.scoreA : match.scoreB;

    if (match.isBye) {
        return {
            matchId: match.id,
            sessionNumber: match.sessionNumber!,
            teamName,
            teamScore,
            opponentName: '-',
            opponentScore: 0,
            outcome: 'bye',
        };
    }

    const opponentName = isTeamA ? match.teamB!.name : match.teamA.name;
    const opponentScore = isTeamA ? match.scoreB : match.scoreA;
    const outcome: 'win' | 'draw' | 'loss' | 'bye' =
        teamScore > opponentScore ? 'win' : teamScore < opponentScore ? 'loss' : 'draw';

    return {
        matchId: match.id,
        sessionNumber: match.sessionNumber!,
        teamName,
        teamScore,
        opponentName,
        opponentScore,
        outcome,
    };
}
