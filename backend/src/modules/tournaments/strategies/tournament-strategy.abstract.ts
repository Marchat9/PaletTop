import { NotImplementedException } from '@nestjs/common';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchesSessionStatus, MatchStatus, TournamentStatus } from 'src/enum/status.enum';
import { ScoreCalculation } from 'src/enum/tounament.enum';
import { MatchHistoryDto, toMatchHistoryDto } from '../../tournaments/responses/match-history.dto';
import { GlobalRankingEntry } from '../../tournaments/responses/ranking.dto';
import { TournamentStatusInfo } from '../../tournaments/responses/tournament-status.dto';
import { computeTournamentScorePoints } from '../../tournaments/utils/score-calculation.utils';

export abstract class TournamentStrategy {
    canStartNextSession(session: MatchesSession): boolean {
        return session.matches.every((m) => m.status === MatchStatus.VALIDATED);
    }

    computeGlobalRanking(tournament: Tournament, matches: TournamentMatch[]): GlobalRankingEntry[] {
        const stats = this.computeStats(tournament.teams, matches);
        const { scoreCalculation } = tournament.configuration;

        stats.sort((a, b) => {
            switch (scoreCalculation) {
                case ScoreCalculation.TOURNAMENT_SCORE:
                    return b.tournamentPoints - a.tournamentPoints;
                case ScoreCalculation.VICTORY_AND_GOAL_AVERAGE:
                    return b.wins - a.wins || b.goalAverage - a.goalAverage;
                default:
                case ScoreCalculation.SCORE:
                    return b.pointsFor - a.pointsFor;
            }
        });

        return stats.map((stat, index) => ({
            ...stat,
            rank: index + 1,
        }));
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

    canCompleteTournament(tournament: Tournament): boolean {
        return tournament.status === TournamentStatus.ACTIVE;
    }

    protected currentSessionNumber(sessions: MatchesSession[]): number {
        return sessions.length ? Math.max(...sessions.map((s) => s.sessionNumber)) : 0;
    }

    protected allMatchesValidated(sessions: MatchesSession[]): boolean {
        const open = sessions.find((s) => s.status !== MatchesSessionStatus.CLOSED);
        if (!open) return false;
        return open.matches.every((m) => m.status === MatchStatus.VALIDATED);
    }

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

    computeRawScoreToPoints(score: number): number {
        return score;
    }

    async prepareTournamentStart(_tournament: Tournament): Promise<void> {
        // No-op par défaut — surcharger pour initialiser des données au démarrage
    }

    async assignTeamsToPools(_tournament: Tournament): Promise<TournamentPool[]> {
        throw new NotImplementedException(
            `assignTeamsToPools must be implemented for ${this.constructor.name}`,
        );
    }

    async generateSessionMatches(
        _tournament: Tournament,
        _session: MatchesSession,
        _pastMatches: TournamentMatch[],
    ): Promise<TournamentMatch[]> {
        throw new NotImplementedException(
            `generateSessionMatches must be implemented for ${this.constructor.name}`,
        );
    }

    protected computeStats(
        teams: Team[],
        matches: TournamentMatch[],
    ): Omit<GlobalRankingEntry, 'rank'>[] {
        return teams.map((team) => {
            const teamMatches = matches.filter(
                (m) => m.teamA.id === team.id || m.teamB?.id === team.id,
            );

            let wins = 0;
            let pointsFor = 0;
            let pointsAgainst = 0;
            let tournamentPoints = 0;

            for (const match of teamMatches) {
                const isTeamA = match.teamA.id === team.id;
                const score = isTeamA ? match.scoreA : match.scoreB;
                const opponentScore = isTeamA ? match.scoreB : match.scoreA;
                pointsFor += score;
                pointsAgainst += opponentScore;
                const won = score > opponentScore;
                if (won) wins++;
                tournamentPoints += computeTournamentScorePoints(won, score);
            }

            return {
                teamId: team.id,
                teamName: team.name,
                wins,
                pointsFor,
                pointsAgainst,
                goalAverage: pointsFor - pointsAgainst,
                matchesPlayed: teamMatches.length,
                tournamentPoints,
            };
        });
    }
}
