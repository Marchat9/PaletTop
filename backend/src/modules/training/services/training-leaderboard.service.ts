import { Injectable } from '@nestjs/common';
import { TrainingMatch } from 'src/entities/training-match.entity';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingTeam } from 'src/entities/training-team.entity';
import { TrainingParticipant } from 'src/entities/training-participant.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { TrainingMatchRepository } from '../repositories/training-match.repository';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import {
    TrainingClubLeaderboardEntryDto,
    TrainingLeaderboardEntryDto,
} from '../responses/training-leaderboard.dto';

/** Who a leaderboard line is for: a session participant, or a club roster member. */
interface RankedPlayer {
    id: string;
    name: string;
}

interface RankedEntry extends RankedPlayer {
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

        return this.rank(matches, (participant) => participant).map(({ id, ...entry }) => ({
            participantId: id,
            ...entry,
        }));
    }

    /**
     * Club leaderboard seen from a session: wins and points of every roster member added up over
     * all the club's sessions up to this one (current one included, later ones left out). A guest,
     * or a member since removed from the roster, does not appear.
     */
    async getClubLeaderboard(sessionCode: string): Promise<TrainingClubLeaderboardEntryDto[]> {
        const session = await this.trainingSessionRepo.findByCodeOrThrow(sessionCode);
        const sessionIds = await this.trainingSessionRepo.findIdsByTrainingUpTo(session);
        const matches = await this.trainingMatchRepo.findValidatedBySessions(sessionIds);

        // Credited to the roster member, so that their sessions add up; a guest has none.
        return this.rank(matches, (participant) => participant.member).map(({ id, ...entry }) => ({
            memberId: id,
            ...entry,
        }));
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
        // Scores are taken as a share of each session's target: 11 points out of 11 weigh as much
        // as 15 out of 15. Raw points would make a player of the 15-point sessions look stronger.
        const current = this.pointsPlayed(
            currentMatches,
            (member) => member.participant.id,
            () => session.pointsPerGame,
        );

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
            (match) => match.session?.pointsPerGame ?? session.pointsPerGame,
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
     * Points scored (as a share of the match's target) and matches played, grouped by the key each
     * team member maps to (participant id within a session, member id across sessions). Byes and
     * unfinished matches are ignored.
     */
    private pointsPlayed(
        matches: TrainingMatch[],
        keyOf: (member: TrainingTeam['members'][number]) => string | null | undefined,
        targetOf: (match: TrainingMatch) => number,
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
            const target = targetOf(match) || 1;
            credit(match.teamA, match.scoreA / target);
            credit(match.teamB, match.scoreB / target);
        }
        return totals;
    }

    /**
     * Wins and points of validated matches, credited to whoever `creditedTo` returns for each
     * player (none: not ranked), sorted by wins then points.
     *
     * Aggregates over ALL members of the team as it was at match time (no leftAt filter): a fixed
     * team dissolved after this match keeps that match in the credit history of its former members,
     * per the "leaderboard by participant" product decision.
     */
    private rank(
        matches: TrainingMatch[],
        creditedTo: (participant: TrainingParticipant) => RankedPlayer | null | undefined,
    ): RankedEntry[] {
        const totals = new Map<string, RankedEntry>();
        const creditTeam = (team: TrainingTeam, score: number, won: boolean) => {
            for (const teamMember of team.members ?? []) {
                const player = creditedTo(teamMember.participant);
                if (!player) {
                    continue;
                }
                const entry = totals.get(player.id) ?? {
                    id: player.id,
                    name: player.name,
                    wins: 0,
                    points: 0,
                };
                entry.wins += won ? 1 : 0;
                entry.points += score;
                totals.set(player.id, entry);
            }
        };
        for (const match of matches) {
            creditTeam(match.teamA, match.scoreA, match.scoreA > match.scoreB);
            if (match.teamB) {
                creditTeam(match.teamB, match.scoreB, match.scoreB > match.scoreA);
            }
        }
        return [...totals.values()].sort((a, b) => b.wins - a.wins || b.points - a.points);
    }
}
