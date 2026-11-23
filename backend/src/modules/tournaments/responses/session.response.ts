import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { groupLabel, groupOrderOrNull } from '../strategies/structured/plan/group-keys';

export interface MatchGroupDto {
    order: number;
    name: string;
    /** French label shown as the group title. */
    label: string;
}

export interface SessionMatchResponseDto {
    id: string;
    status: string;
    isBye: boolean;
    /** A bye worth one win (shown as an exempt win). */
    byeWin: boolean;
    scoreA: number;
    scoreB: number;
    plateNumber: number | null;
    sessionNumber: number | null;
    poolNumber: number | null;
    // No team code: it is the team's credential, and this DTO is public (spectators).
    teamA: { id: string; name: string };
    teamB: { id: string; name: string } | null;
    group: MatchGroupDto | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    duration: number | null;
}

export interface SessionResponseDto {
    id: string;
    sessionNumber: number;
    status: string;
    /** Random draw or fixed rotation: once closed, the admin may still correct its scores. */
    isDrawnRound: boolean;
    matches: SessionMatchResponseDto[];
}

function toMatchGroup(poolName: string | null | undefined): MatchGroupDto | null {
    if (!poolName) return null;
    const order = groupOrderOrNull(poolName);
    const label = groupLabel(poolName);
    if (order === null || label === null) return null;
    return { order, name: poolName, label };
}

export function toSessionMatchResponseDto(match: TournamentMatch): SessionMatchResponseDto {
    return {
        id: match.id,
        status: match.status,
        isBye: match.isBye,
        byeWin: !!match.byeWin,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        plateNumber: match.plateNumber ?? null,
        sessionNumber: match.sessionNumber ?? null,
        poolNumber: match.pool?.poolNumber ?? null,
        teamA: { id: match.teamA.id, name: match.teamA.name },
        teamB: match.teamB ? { id: match.teamB.id, name: match.teamB.name } : null,
        group: toMatchGroup(match.pool?.name),
        startedAt: match.startedAt ?? null,
        finishedAt: match.finishedAt ?? null,
        duration: match.duration ?? null,
    };
}

export function toSessionResponseDto(
    session: MatchesSession,
    isDrawnRound: boolean,
): SessionResponseDto {
    return {
        id: session.id,
        sessionNumber: session.sessionNumber,
        status: session.status,
        isDrawnRound,
        matches: (session.matches ?? []).map(toSessionMatchResponseDto),
    };
}
