import { Injectable } from '@nestjs/common';
import { TrainingMatch } from 'src/entities/training-match.entity';
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
     * Estimated level of each participant of the session: points scored per match on average. More
     * stable than a win rate when few matches have been played. A player who has not played a match
     * yet is absent from it - their level is unknown, not zero.
     */
    async getAveragePointsBySessionId(sessionId: string): Promise<Record<string, number>> {
        const matches = await this.trainingMatchRepo.findValidatedBySession(sessionId);
        return this.averagePointsFromMatches(matches);
    }

    /**
     * Same estimate, from matches already in memory (VALIDATED only). Lets a caller that has just
     * loaded the whole session - the round generator does - skip a second trip to the database.
     */
    averagePointsFromMatches(matches: TrainingMatch[]): Record<string, number> {
        const validated = matches.filter((match) => match.status === MatchStatus.VALIDATED);

        const totals = new Map<string, { points: number; played: number }>();
        const credit = (team: TrainingTeam, score: number): void => {
            for (const member of team.members ?? []) {
                const entry = totals.get(member.participant.id) ?? { points: 0, played: 0 };
                entry.points += score;
                entry.played += 1;
                totals.set(member.participant.id, entry);
            }
        };

        for (const match of validated) {
            credit(match.teamA, match.scoreA);
            if (match.teamB) {
                credit(match.teamB, match.scoreB);
            }
        }

        const levels: Record<string, number> = {};
        for (const [participantId, entry] of totals) {
            levels[participantId] = entry.points / entry.played;
        }
        return levels;
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
