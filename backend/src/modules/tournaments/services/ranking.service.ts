import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { TournamentRepository } from 'src/modules/tournaments/repositories/tournament.repository';
import { RealtimeGateway } from 'src/modules/realtime/realtime.gateway';
import { MatchHistoryDto } from '../responses/match-history.dto';
import { toPlayerMatchDto, PlayerMatchDto } from '../responses/player-match.dto';
import { GlobalRankingEntry } from '../responses/ranking.dto';
import { SessionRepository } from '../repositories/session.repository';
import { TournamentStrategyFactory } from '../strategies/tournament-strategy.factory';

@Injectable()
export class RankingService {
    private readonly logger = new Logger(RankingService.name);
    private readonly rankingTimers = new Map<string, ReturnType<typeof setTimeout>>();

    constructor(
        private readonly tournamentRepo: TournamentRepository,
        private readonly sessionRepo: SessionRepository,
        private readonly gateway: RealtimeGateway,
        private readonly strategyFactory: TournamentStrategyFactory,
    ) {}

    scheduleRankingUpdate(tournamentCode: string): void {
        const existing = this.rankingTimers.get(tournamentCode);
        if (existing) clearTimeout(existing);

        const delay = parseInt(process.env['RANKING_DEBOUNCE_MS'] ?? '500', 10);
        this.logger.debug(
            `Ranking update scheduled for tournament ${tournamentCode} in ${delay}ms`,
        );
        const timer = setTimeout(async () => {
            this.rankingTimers.delete(tournamentCode);
            const ranking = await this.getGlobalRanking(tournamentCode);
            this.logger.log(
                `Ranking emitted for tournament ${tournamentCode} (${ranking.length} teams)`,
            );
            this.gateway.emitRankingUpdated(tournamentCode, ranking);
        }, delay);

        this.rankingTimers.set(tournamentCode, timer);
    }

    async getTeamCurrentMatch(
        tournamentCode: string,
        teamCode: string,
    ): Promise<PlayerMatchDto | null> {
        const tournament = await this.tournamentRepo.findWithRelations(
            { code: tournamentCode },
            { withTeams: true },
        );
        if (!tournament) throw new NotFoundException('Tournoi introuvable');

        const team = tournament.teams.find((t) => t.code === teamCode);
        if (!team) throw new NotFoundException('Équipe introuvable');

        const openSession = await this.sessionRepo.findOpenByTournament(tournament.id);
        if (!openSession) return null;

        const match = openSession.matches.find(
            (m) => m.teamA.id === team.id || m.teamB?.id === team.id,
        );
        if (!match) return null;

        match.session = openSession;
        return toPlayerMatchDto(match);
    }

    async getTeamHistory(tournamentCode: string, teamCode: string): Promise<MatchHistoryDto[]> {
        const historyByTeamCode = await this.getAllTeamsHistory(tournamentCode);
        const history = historyByTeamCode.get(teamCode);
        if (history === undefined) throw new NotFoundException('Équipe introuvable');
        return history;
    }

    // Computes every team's history from one DB round trip instead of one per team — used
    // whenever several teams' histories are needed together (e.g. after closing a session),
    // where calling getTeamHistory() in a loop would re-fetch the whole tournament and its
    // closed matches once per team.
    async getAllTeamsHistory(tournamentCode: string): Promise<Map<string, MatchHistoryDto[]>> {
        const tournament = await this.tournamentRepo.findWithRelations(
            { code: tournamentCode },
            { withTeams: true },
        );
        if (!tournament) throw new NotFoundException('Tournoi introuvable');

        const closedSessions = await this.sessionRepo.findAllClosedByTournament(tournament.id);
        const allClosedMatches: TournamentMatch[] = closedSessions.flatMap((s) => s.matches);

        const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
        return new Map(
            tournament.teams.map((team) => [
                team.code,
                strategy.computeTeamHistory(allClosedMatches, team.id),
            ]),
        );
    }

    async getGlobalRanking(tournamentCode: string): Promise<GlobalRankingEntry[]> {
        const tournament = await this.tournamentRepo.findWithRelations(
            { code: tournamentCode },
            { withTeams: true },
        );
        if (!tournament) throw new NotFoundException('Tournoi introuvable');

        const sessions = await this.sessionRepo.findAllByTournament(tournament.id);
        const validatedMatches = sessions
            .flatMap((s) => s.matches)
            .filter((m) => m.status === MatchStatus.VALIDATED);

        const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
        return strategy.computeGlobalRanking(tournament, validatedMatches);
    }
}
