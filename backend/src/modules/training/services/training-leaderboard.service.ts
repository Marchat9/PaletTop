import { Injectable } from '@nestjs/common';
import { TrainingMatch } from 'src/entities/training-match.entity';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingTeam } from 'src/entities/training-team.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { TrainingMatchRepository } from '../repositories/training-match.repository';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { TrainingLeaderboardEntryDto } from '../responses/training-leaderboard.dto';

interface LeaderboardAccumulator {
    name: string;
    wins: number;
    points: number;
}

@Injectable()
export class TrainingLeaderboardService {
    constructor(
        private readonly trainingSessionRepo: TrainingSessionRepository,
        private readonly trainingMatchRepo: TrainingMatchRepository,
    ) {}

    async getLeaderboard(sessionCode: string): Promise<TrainingLeaderboardEntryDto[]> {
        const session = await this.trainingSessionRepo.findByCodeOrThrow(sessionCode);
        return this.getLeaderboardBySessionId(session.id);
    }

    // To use when the caller has already resolved or loaded the session (right after validating a
    // match, for instance): avoids re-fetching the whole session with its joins just for its id.
    async getLeaderboardBySessionId(sessionId: string): Promise<TrainingLeaderboardEntryDto[]> {
        const matches = await this.trainingMatchRepo.findValidatedBySession(sessionId);

        const totals = new Map<string, LeaderboardAccumulator>();
        for (const match of matches) {
            this.creditTeam(totals, match.teamA, match.scoreA, match.scoreA > match.scoreB);
            if (match.teamB) {
                this.creditTeam(totals, match.teamB, match.scoreB, match.scoreB > match.scoreA);
            }
        }

        return [...totals.entries()]
            .map(([participantId, entry]) => ({ participantId, ...entry }))
            .sort((a, b) => b.wins - a.wins || b.points - a.points);
    }

    /**
     * Estimated level of each participant: average points scored per match. More stable than a win
     * rate when few matches have been played, and a player who has not played is absent (level
     * unknown, not zero).
     *
     * The window is the current session plus the group's `historyDepth` most recent other sessions.
     * Only roster members carry across sessions - a participant row is per-session, so a guest
     * (no member) is levelled on the current session alone. The current-session matches are passed
     * in from memory (the round generator already holds them); the history is fetched here.
     */
    async getLevelByParticipant(
        session: TrainingSession,
        currentMatches: TrainingMatch[],
        historyDepth: number,
    ): Promise<Record<string, number>> {
        const current = this.pointsPlayed(currentMatches, (member) => member.participant.id);

        const historySessionIds = await this.trainingSessionRepo.findRecentIdsByTraining(
            session.training.id,
            session.id,
            historyDepth,
        );
        const historyMatches =
            await this.trainingMatchRepo.findValidatedBySessions(historySessionIds);
        const history = this.pointsPlayed(
            historyMatches,
            (member) => member.participant.member?.id ?? null,
        );

        const levels: Record<string, number> = {};
        for (const participant of session.participants ?? []) {
            const total = { points: 0, played: 0 };
            const own = current.get(participant.id);
            if (own) {
                total.points += own.points;
                total.played += own.played;
            }
            const past = participant.member ? history.get(participant.member.id) : undefined;
            if (past) {
                total.points += past.points;
                total.played += past.played;
            }
            if (total.played > 0) {
                levels[participant.id] = total.points / total.played;
            }
        }
        return levels;
    }

    /**
     * Points scored and matches played, grouped by the key each team member maps to (participant id
     * within a session, member id across sessions). Byes and unfinished matches are ignored.
     */
    private pointsPlayed(
        matches: TrainingMatch[],
        keyOf: (member: TrainingTeam['members'][number]) => string | null | undefined,
    ): Map<string, { points: number; played: number }> {
        const totals = new Map<string, { points: number; played: number }>();
        const credit = (team: TrainingTeam, score: number): void => {
            for (const member of team.members ?? []) {
                const key = keyOf(member);
                if (!key) continue;
                const entry = totals.get(key) ?? { points: 0, played: 0 };
                entry.points += score;
                entry.played += 1;
                totals.set(key, entry);
            }
        };

        for (const match of matches) {
            if (match.isBye || !match.teamB || match.status !== MatchStatus.VALIDATED) {
                continue;
            }
            credit(match.teamA, match.scoreA);
            credit(match.teamB, match.scoreB);
        }
        return totals;
    }

    // Aggregates over ALL members of the team as it was at match time (no leftAt filter): a fixed
    // team dissolved after this match keeps that match in the credit history of its former members,
    // per the "leaderboard by participant" product decision.
    private creditTeam(
        totals: Map<string, LeaderboardAccumulator>,
        team: TrainingTeam,
        score: number,
        won: boolean,
    ): void {
        for (const member of team.members ?? []) {
            const entry = totals.get(member.participant.id) ?? {
                name: member.participant.name,
                wins: 0,
                points: 0,
            };
            entry.wins += won ? 1 : 0;
            entry.points += score;
            totals.set(member.participant.id, entry);
        }
    }
}
