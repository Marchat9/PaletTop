import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { MatchStatus } from 'src/enum/status.enum';

export interface PlayerMatchDto {
    id: string;
    status: MatchStatus;
    isBye: boolean;
    scoreA: number;
    scoreB: number;
    plateNumber: number | null;
    teamA: { id: string; name: string };
    teamB: { id: string; name: string } | null;
    startedAt: string | null;
    finishedAt: string | null;
    duration: number | null;
    session: { id: string; sessionNumber: number };
}

export function toPlayerMatchDto(match: TournamentMatch): PlayerMatchDto {
    return {
        id: match.id,
        status: match.status,
        isBye: match.isBye,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        plateNumber: match.plateNumber,
        teamA: { id: match.teamA.id, name: match.teamA.name },
        teamB: match.teamB ? { id: match.teamB.id, name: match.teamB.name } : null,
        startedAt: match.startedAt?.toISOString() ?? null,
        finishedAt: match.finishedAt?.toISOString() ?? null,
        duration: match.duration,
        session: { id: match.session!.id, sessionNumber: match.sessionNumber! },
    };
}
