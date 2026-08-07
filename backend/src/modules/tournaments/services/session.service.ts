import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchesSessionStatus, TournamentStatus } from 'src/enum/status.enum';
import { RealtimeGateway } from 'src/modules/realtime/realtime.gateway';
import { TournamentRepository } from 'src/modules/tournaments/repositories/tournament.repository';
import {
    AdminTournamentDto,
    toAdminTournamentDto,
    toTournamentMetaDto,
} from 'src/modules/tournaments/responses/admin-tournament.dto';
import { TournamentAuthService } from 'src/modules/tournaments/services/tournament-auth.service';
import { sanitizeTournament } from 'src/modules/tournaments/utils/tournament.utils';
import { MatchRepository } from '../repositories/match.repository';
import { SessionRepository } from '../repositories/session.repository';
import { toPlayerMatchDto } from '../responses/player-match.dto';
import { SessionResponseDto, toSessionResponseDto } from '../responses/session.response';
import { TournamentStatusInfo } from '../responses/tournament-status.dto';
import { RankingService } from './ranking.service';
import { PoolRepository } from '../repositories/pool.repository';
import { TournamentStrategy } from '../strategies/tournament-strategy.abstract';
import { TournamentStrategyFactory } from '../strategies/tournament-strategy.factory';

@Injectable()
export class SessionService {
    private readonly logger = new Logger(SessionService.name);

    constructor(
        private readonly tournamentRepo: TournamentRepository,
        private readonly sessionRepo: SessionRepository,
        private readonly matchRepo: MatchRepository,
        private readonly poolRepo: PoolRepository,
        private readonly tournamentAuthService: TournamentAuthService,
        private readonly gateway: RealtimeGateway,
        private readonly rankingService: RankingService,
        private readonly strategyFactory: TournamentStrategyFactory,
    ) {}

    async startTournament(code: string, password: string): Promise<AdminTournamentDto> {
        const tournament = await this.tournamentAuthService.findWithAdminAuth({ code }, password, {
            withTeams: true,
        });

        if (tournament.status !== TournamentStatus.DRAFT) {
            throw new BadRequestException('Le tournoi doit être en mode brouillon pour démarrer.');
        }
        if (!tournament.teams.length) {
            throw new BadRequestException('Aucune équipe inscrite au tournoi.');
        }

        const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
        await strategy.prepareTournamentStart(tournament);

        // assign saved pools in current tournament object
        tournament.pools = await strategy.assignTeamsToPools(tournament);

        const session = await this.sessionRepo.save(
            this.sessionRepo.create({
                tournament: { id: tournament.id } as Tournament,
                sessionNumber: 1,
            }),
        );

        await strategy.generateSessionMatches(tournament, session, []);
        await this.tournamentRepo.updateStatus(tournament.id, TournamentStatus.ACTIVE);

        const updatedTournament = await this.tournamentRepo.findWithRelations(
            { id: tournament.id },
            { withTeams: true, withMatchesInTeams: true, withSessions: true },
        );
        if (!updatedTournament) {
            this.logger.error(`Tournament '${tournament.code}' not found after start.`);
            throw new NotFoundException('Tournoi introuvable après démarrage.');
        }

        this.logger.log(`Tournament ${tournament.code} started — session 1 created`);
        const loadedSession = await this.sessionRepo.findByIdWithMatches(session.id);
        if (loadedSession) {
            this.gateway.emitSessionUpdated(tournament.code, toSessionResponseDto(loadedSession));
            this.emitNewMatchForEachTeam(tournament.code, loadedSession);

            // Emit first ranking - everyone with 0 point.
            this.rankingService.scheduleRankingUpdate(tournament.code);
        }

        const statusAfterStart = await this.buildTournamentStatus(strategy, updatedTournament);
        const tournamentWithStatus = toAdminTournamentDto(updatedTournament, statusAfterStart);

        this.gateway.emitTournamentUpdated(tournament.code, tournamentWithStatus);

        return tournamentWithStatus;
    }

    async nextSession(code: string, password: string): Promise<AdminTournamentDto> {
        const tournament = await this.tournamentAuthService.findWithAdminAuth({ code }, password, {
            withTeams: true,
        });

        if (tournament.status !== TournamentStatus.ACTIVE) {
            throw new BadRequestException(
                `Impossible de générer la prochaine session pour un tournoi en statut "${tournament.status}".`,
            );
        }

        tournament.pools = await this.poolRepo.findByTournamentWithTeams(tournament.id);

        const nextSessionTournament = await this.advanceToNextSession(tournament);

        const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
        const tournamentWithStatus = await this.buildTournamentStatus(
            strategy,
            nextSessionTournament,
        );

        return toAdminTournamentDto(nextSessionTournament, tournamentWithStatus);
    }

    async getSessions(code: string): Promise<SessionResponseDto[]> {
        const tournament = await this.tournamentRepo.findByCode(code);
        if (!tournament) throw new NotFoundException('Tournoi introuvable');
        const sessions = await this.sessionRepo.findAllByTournament(tournament.id);
        return sessions.map(toSessionResponseDto);
    }

    async getSession(code: string, sessionNumber: number): Promise<SessionResponseDto> {
        const tournament = await this.tournamentRepo.findByCode(code);
        if (!tournament) throw new NotFoundException('Tournoi introuvable');

        const session = await this.sessionRepo.findOneByTournamentAndNumber(
            tournament.id,
            sessionNumber,
        );
        if (!session) throw new NotFoundException('Session introuvable');
        return toSessionResponseDto(session);
    }

    async completeTournament(code: string, password: string): Promise<AdminTournamentDto> {
        const tournament = await this.tournamentAuthService.findWithAdminAuth({ code }, password, {
            withTeams: true,
        });

        const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
        if (!strategy.canCompleteTournament(tournament)) {
            throw new BadRequestException(
                `Le tournoi doit être ACTIVE pour être clôturé. Statut actuel : "${tournament.status}".`,
            );
        }

        this.logger.log(
            `Tournament ${tournament.code} completing — transitioning ACTIVE → COMPLETED`,
        );
        const openSession = await this.sessionRepo.findOpenByTournament(tournament.id);
        if (openSession) {
            await this.sessionRepo.updateStatus(openSession.id, MatchesSessionStatus.CLOSED);
            const closedSession = await this.sessionRepo.findByIdWithMatches(openSession.id);
            if (closedSession) {
                this.gateway.emitSessionUpdated(
                    tournament.code,
                    toSessionResponseDto(closedSession),
                );
                await this.emitHistoryForSession(tournament.code, closedSession);
            }
        }

        await this.tournamentRepo.updateStatus(tournament.id, TournamentStatus.COMPLETED);

        const result = await this.tournamentRepo.findWithRelations(
            { id: tournament.id },
            { withTeams: true },
        );
        if (!result) throw new NotFoundException('Tournoi introuvable après clôture.');

        const statusAfterComplete = await this.buildTournamentStatus(strategy, result);
        this.gateway.emitTournamentUpdated(
            tournament.code,
            toTournamentMetaDto(result, statusAfterComplete),
        );

        return toAdminTournamentDto(result, statusAfterComplete);
    }

    private async advanceToNextSession(tournament: Tournament): Promise<Tournament> {
        const currentSession = await this.sessionRepo.findLatestByTournament(tournament.id);
        if (!currentSession) {
            throw new BadRequestException('Aucune session trouvée.');
        }

        const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
        if (!strategy.canStartNextSession(currentSession)) {
            throw new BadRequestException(
                'Tous les matchs de la session en cours doivent être validés avant de lancer la suivante.',
            );
        }

        await this.sessionRepo.updateStatus(currentSession.id, MatchesSessionStatus.CLOSED);
        this.logger.log(
            `Tournament ${tournament.code} — session ${currentSession.sessionNumber} closed, advancing to session ${currentSession.sessionNumber + 1}`,
        );

        const closedSession = await this.sessionRepo.findByIdWithMatches(currentSession.id);
        if (closedSession) {
            this.gateway.emitSessionUpdated(tournament.code, toSessionResponseDto(closedSession));
            await this.emitHistoryForSession(tournament.code, closedSession);
        }

        const pastMatches = await this.matchRepo.findByTournament(tournament.id);

        const newSession = await this.sessionRepo.save(
            this.sessionRepo.create({
                tournament: { id: tournament.id } as Tournament,
                sessionNumber: currentSession.sessionNumber + 1,
            }),
        );

        await strategy.generateSessionMatches(tournament, newSession, pastMatches);

        const result = await this.tournamentRepo.findWithRelations(
            { id: tournament.id },
            { withTeams: true, withMatchesInTeams: true, withSessions: true },
        );
        if (!result) throw new NotFoundException('Tournoi introuvable après session.');

        const loadedNewSession = await this.sessionRepo.findByIdWithMatches(newSession.id);
        if (loadedNewSession) {
            this.gateway.emitSessionUpdated(
                tournament.code,
                toSessionResponseDto(loadedNewSession),
            );
            this.emitNewMatchForEachTeam(tournament.code, loadedNewSession);
        }
        const statusAfterAdvance = await this.buildTournamentStatus(strategy, result);
        this.gateway.emitTournamentUpdated(
            tournament.code,
            toTournamentMetaDto(result, statusAfterAdvance),
        );

        return sanitizeTournament(result);
    }

    public async buildTournamentStatus(
        strategy: TournamentStrategy | null,
        tournament: Tournament,
    ): Promise<TournamentStatusInfo | null> {
        try {
            const strat: TournamentStrategy =
                strategy || this.strategyFactory.create(tournament.configuration.competitionMode);
            const sessions = await this.sessionRepo.findAllByTournament(tournament.id);
            return strat.computeTournamentStatus(tournament, sessions);
        } catch (e) {
            this.logger.error(`Tournament status failed`, e);
            return null;
        }
    }

    private async emitHistoryForSession(
        tournamentCode: string,
        session: MatchesSession,
    ): Promise<void> {
        const teamCodes = new Set<string>();
        for (const match of session.matches) {
            if (match.teamA?.code) teamCodes.add(match.teamA.code);
            if (match.teamB?.code) teamCodes.add(match.teamB.code);
        }
        for (const teamCode of teamCodes) {
            const history = await this.rankingService.getTeamHistory(tournamentCode, teamCode);
            this.gateway.emitHistoryUpdated(tournamentCode, teamCode, history);
        }
    }

    private emitNewMatchForEachTeam(code: string, session: MatchesSession) {
        for (const match of session.matches) {
            this.gateway.emitMatchUpdated(
                code,
                match.teamA.code,
                match.teamB?.code ?? null,
                toPlayerMatchDto({
                    ...match,
                    session: {
                        id: session.id,
                        sessionNumber: session.sessionNumber,
                        status: session.status,
                    },
                } as TournamentMatch),
            );
        }
    }
}
