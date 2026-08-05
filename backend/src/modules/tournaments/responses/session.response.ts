import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { MATCH_GROUP_ORDER, MatchGroupKey } from 'src/enum/tounament.enum';

export interface MatchGroupDto {
    order: number;
    name: MatchGroupKey;
}

export interface SessionMatchResponseDto {
    id: string;
    status: string;
    isBye: boolean;
    scoreA: number;
    scoreB: number;
    plateNumber: number | null;
    sessionNumber: number | null;
    poolNumber: number | null;
    teamA: { id: string; name: string; code: string };
    teamB: { id: string; name: string; code: string } | null;
    group: MatchGroupDto | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    duration: number | null;
}

export interface SessionResponseDto {
    id: string;
    sessionNumber: number;
    status: string;
    matches: SessionMatchResponseDto[];
}

function toMatchGroup(poolName: string | null | undefined): MatchGroupDto | null {
    if (!poolName) return null;
    const order = MATCH_GROUP_ORDER[poolName as MatchGroupKey];
    if (order === undefined) return null;
    return { order, name: poolName as MatchGroupKey };
}

export function toSessionMatchResponseDto(match: TournamentMatch): SessionMatchResponseDto {
    return {
        id: match.id,
        status: match.status,
        isBye: match.isBye,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        plateNumber: match.plateNumber ?? null,
        sessionNumber: match.sessionNumber ?? null,
        poolNumber: match.pool?.poolNumber ?? null,
        teamA: { id: match.teamA.id, name: match.teamA.name, code: match.teamA.code },
        teamB: match.teamB
            ? { id: match.teamB.id, name: match.teamB.name, code: match.teamB.code }
            : null,
        group: toMatchGroup(match.pool?.name),
        startedAt: match.startedAt ?? null,
        finishedAt: match.finishedAt ?? null,
        duration: match.duration ?? null,
    };
}

export function toSessionResponseDto(session: MatchesSession): SessionResponseDto {
    return {
        id: session.id,
        sessionNumber: session.sessionNumber,
        status: session.status,
        matches: (session.matches ?? []).map(toSessionMatchResponseDto),
    };
}
