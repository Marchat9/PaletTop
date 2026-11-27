import { NotImplementedException } from '@nestjs/common';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchesSessionStatus, MatchStatus, TournamentStatus } from 'src/enum/status.enum';
import { MatchHistoryDto, toMatchHistoryDto } from '../../tournaments/responses/match-history.dto';
import { GlobalRankingEntry } from '../../tournaments/responses/ranking.dto';
import { TournamentStatusInfo } from '../../tournaments/responses/tournament-status.dto';
import { TeamTournamentStatus } from '../../tournaments/responses/player-team.dto';
import { rankTeams } from '../../tournaments/utils/ranking-calculation.utils';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { FillThresholds, TournamentPlan } from './structured/plan/plan.types';

/** App settings a plan depends on, read by the service layer (strategies have no settings). */
export interface PlanSettings {
    maxConsolations: number;
    thresholds: FillThresholds;
}

/** What the admin confirmed in the launch dialog; absent fields keep the stored configuration. */
export interface StartChoice {
    consolationCount?: number;
    eliminatedAfterQualifying?: number;
}

/** App settings a session generation depends on, read by the service layer. */
export interface GenerationOptions {
    /** Highest score the loser of a qualifying bye is given (the winner gets `pointsPerGame`). */
    byeLoserCap: number;
}

/** What a strategy may need to prepare the start, read by the service layer. */
export interface StartOptions {
    settings: PlanSettings;
    choice: StartChoice;
}

export abstract class TournamentStrategy {
    /**
     * Whether `maxTeamCapacity` caps the registrations. A soft capacity is only a target: teams can
     * register up to the absolute maximum (`MAX_TEAM_CAPACITY`).
     */
    isTeamCapacityHard(): boolean {
        return true;
    }

    /**
     * The tournament plan (brackets, rounds, warnings, launch options) for `teamCount` teams, or
     * `null` for modes without a plan. Must not throw on a configuration that no longer fits the
     * team count: the plan reports it as a warning.
     */
    computePlan(
        _tournament: Tournament,
        _teamCount: number,
        _settings: PlanSettings,
    ): TournamentPlan | null {
        return null;
    }

    canStartNextSession(session: MatchesSession): boolean {
        return (
            session.status === MatchesSessionStatus.OPEN &&
            session.matches.every((m) => m.status === MatchStatus.VALIDATED)
        );
    }

    canCompleteTournament(tournament: Tournament): boolean {
        return (
            tournament.status === TournamentStatus.ACTIVE &&
            tournament.matchsSessions.every((ms) =>
                ms.matches.every((m) => m.status === MatchStatus.VALIDATED),
            )
        );
    }

    /**
     * True when this session's pairs did not come from earlier results (random draw, fixed
     * rotation): its scores fed no later pairing, so the admin may still correct them, winner
     * included, once the session is closed. Brackets and ranking rounds stay locked.
     */
    isDrawnSession(_tournament: Tournament, _sessionNumber: number): boolean {
        return false;
    }

    /** Aggregate ranking over the given matches, sorted by the tournament's score calculation. */
    computeGlobalRanking(tournament: Tournament, matches: TournamentMatch[]): GlobalRankingEntry[] {
        // Only the display fields leave: the work fields of the ranking (gaps, worst loss, frozen
        // draw) stay out of the payloads, like in the pool ranking.
        return rankTeams(
            tournament.teams,
            matches,
            tournament.configuration.scoreCalculation,
            tournament.id,
        ).map((entry) => ({
            rank: entry.rank,
            teamId: entry.teamId,
            teamName: entry.teamName,
            wins: entry.wins,
            pointsFor: entry.pointsFor,
            pointsAgainst: entry.pointsAgainst,
            goalAverage: entry.goalAverage,
            matchesPlayed: entry.matchesPlayed,
            tournamentPoints: entry.tournamentPoints,
            losses: entry.losses,
        }));
    }

    /**
     * The ranking shown to everyone. By default it is the aggregate ranking above; modes with an
     * elimination phase override this to place teams by how far they got in the bracket. It is kept
     * separate from `computeGlobalRanking` on purpose: that one still seeds the brackets and must
     * stay a plain aggregate, whereas this one describes the final standings. It takes every match
     * of the tournament: only the validated ones count.
     */
    computeStandings(tournament: Tournament, matches: TournamentMatch[]): GlobalRankingEntry[] {
        return this.computeGlobalRanking(
            tournament,
            matches.filter((m) => m.status === MatchStatus.VALIDATED),
        );
    }

    /** Place of a team in the tournament, beyond its results; modes without brackets have none. */
    computeTeamStatus(
        _tournament: Tournament,
        _matches: TournamentMatch[],
        _teamId: string,
    ): TeamTournamentStatus {
        return { eliminatedAfterQualifying: false };
    }

    computeTeamHistory(matches: TournamentMatch[], teamId: string): MatchHistoryDto[] {
        const teamMatches = matches.filter(
            (m) =>
                m.status === MatchStatus.VALIDATED &&
                (m.teamA.id === teamId || m.teamB?.id === teamId),
        );
        return teamMatches.map((m) => toMatchHistoryDto(m, teamId));
    }

    abstract computeTournamentStatus(
        tournament: Tournament,
        sessions: MatchesSession[],
    ): TournamentStatusInfo;

    assignPlateNumbers(
        matches: TournamentMatch[],
        numberOfPlaques: number = Number.MAX_VALUE,
    ): TournamentMatch[] {
        const assignedMatches: TournamentMatch[] = matches.reduce(
            (prev, curr) => ({
                plateNumber: curr.isBye ? prev.plateNumber : prev.plateNumber + 1,
                matches: [
                    ...prev.matches,
                    {
                        ...curr,
                        plateNumber: curr.isBye ? null : prev.plateNumber,
                    } as TournamentMatch,
                ],
            }),
            { matches: [] as TournamentMatch[], plateNumber: 1 },
        ).matches;

        if (assignedMatches.filter((m) => !!m.plateNumber).length > numberOfPlaques) {
            throw new Error(
                `Impossible d'attribuer les plaques : ${matches.filter((m) => !m.isBye).length} matchs pour ${numberOfPlaques} plaques disponibles.`,
            );
        }
        return assignedMatches;
    }

    /**
     * Mutating strategy method: persists its own changes via the repos it was
     * constructed with and returns the saved entity. Callers must merge this
     * return value into their in-memory state instead of re-reading from the DB.
     */
    async prepareTournamentStart(
        _tournament: Tournament,
        _options?: StartOptions,
    ): Promise<Tournament> {
        // No-op par défaut — surcharger pour initialiser des données au démarrage
        return _tournament;
    }

    /**
     * Mutating strategy method: persists its own changes via the repos it was
     * constructed with and returns the saved entities. Callers must merge this
     * return value into their in-memory state instead of re-reading from the DB.
     */
    async assignTeamsToFirstPools(_tournament: Tournament): Promise<TournamentPool[]> {
        throw new NotImplementedException(
            `assignTeamsToPools must be implemented for ${this.constructor.name}`,
        );
    }

    /**
     * Mutating strategy method: persists its own changes via the repos it was
     * constructed with and returns the saved entities. Callers must merge this
     * return value into their in-memory state instead of re-reading from the DB.
     */
    async generateSessionMatches(
        _tournament: Tournament,
        _session: MatchesSession,
        _options: GenerationOptions,
    ): Promise<TournamentMatch[]> {
        throw new NotImplementedException(
            `generateSessionMatches must be implemented for ${this.constructor.name}`,
        );
    }

    // ========= Helpers =========
    protected currentSessionNumber(sessions: MatchesSession[]): number {
        return sessions.length ? Math.max(...sessions.map((s) => s.sessionNumber)) : 0;
    }
    protected allMatchesValidated(sessions: MatchesSession[]): boolean {
        const open = sessions.find((s) => s.status !== MatchesSessionStatus.CLOSED);
        if (!open) return false;
        return open.matches.every((m) => m.status === MatchStatus.VALIDATED);
    }
    // ===========================
}
