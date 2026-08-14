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
import { MatchHistoryDto } from 'src/modules/tournaments/responses/match-history.dto';
import { TournamentAuthService } from 'src/modules/tournaments/services/tournament-auth.service';
import { sanitizeTournament } from 'src/modules/tournaments/utils/tournament.utils';
import { SessionRepository } from '../repositories/session.repository';
import { toPlayerMatchDto } from '../responses/player-match.dto';
import { SessionResponseDto, toSessionResponseDto } from '../responses/session.response';
import { TournamentStatusInfo } from '../responses/tournament-status.dto';
import { TournamentStrategy } from '../strategies/tournament-strategy.abstract';
import { TournamentStrategyFactory } from '../strategies/tournament-strategy.factory';
import { RankingService } from './ranking.service';
import {
    appendMatchesSessionToTournament,
    updateTournamentWithUpdatedSession,
} from 'src/modules/tournaments/strategies/tournament-strategy.utils';

@Injectable()
export class SessionService {
    private readonly logger = new Logger(SessionService.name);

    constructor(
        private readonly tournamentRepo: TournamentRepository,
        private readonly sessionRepo: SessionRepository,
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
        // ==== Common data ====
        const tournamentId = tournament.id;
        const tournamentCode = tournament.code;
        const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
        // ====================

        // ====== Common ======
        // Common step: Create initial session
        const session = await this.sessionRepo.save(
            this.sessionRepo.create({
                tournament: { id: tournamentId } as Tournament,
                sessionNumber: 1,
            }),
        );
        // Common step: Update Tournament status
        const tournamentActive = await this.tournamentRepo.updateStatus(
            tournament,
            TournamentStatus.ACTIVE,
        );
        this.logger.log(`Tournament ${tournamentCode} started with session '1' created`);
        // ====================

        // ========== Strategy ==========
        // Strategy step: Prepare Tournament to start
        const tournamentPrepared = await strategy.prepareTournamentStart(tournamentActive);

        // Strategy step: Assign saved pools in current tournament object
        const tournamentWithPool = {
            ...tournamentPrepared,
            pools: await strategy.assignTeamsToFirstPools(tournamentPrepared),
        };

        // Strategy step: Generate matches in session first
        const tournamentWithMatches = appendMatchesSessionToTournament(
            tournamentWithPool,
            session,
            await strategy.generateSessionMatches(tournamentWithPool, session),
        );
        // ==============================

        // ==== Final common steps ====
        // data
        const newSessionMatches = tournamentWithMatches.matchsSessions.find(
            (s) => s.sessionNumber === session.sessionNumber,
        )!;
        // Emit new session data
        this.gateway.emitSessionUpdated(tournamentCode, toSessionResponseDto(newSessionMatches));
        // Emit match for every team in new session
        this.emitNewMatchForEachTeam(tournamentCode, newSessionMatches);

        // Emit first ranking - everyone with 0 point.
        this.rankingService.scheduleRankingUpdate(tournamentCode);

        // Build then return and emit tournament status info.
        const statusAfterStart = await this.buildTournamentStatus(strategy, tournamentWithMatches);
        const tournamentWithStatusInfo = toAdminTournamentDto(
            tournamentWithMatches,
            statusAfterStart,
        );
        this.gateway.emitTournamentUpdated(tournamentCode, tournamentWithStatusInfo);
        // ====================

        return tournamentWithStatusInfo;
    }

    async nextSession(code: string, password: string): Promise<AdminTournamentDto> {
        const tournament = await this.tournamentAuthService.findWithAdminAuth({ code }, password, {
            withTeams: true,
            withMatches: true,
            withSessions: true,
            withPools: true,
        });

        if (tournament.status !== TournamentStatus.ACTIVE) {
            throw new BadRequestException(
                `Impossible de générer la prochaine session pour un tournoi en statut "${tournament.status}".`,
            );
        }

        // ==== Common data ====
        const tournamentId = tournament.id;
        const tournamentCode = tournament.code;
        const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
        const currentSession = tournament.matchsSessions.sort(
            (a, b) => b.sessionNumber - a.sessionNumber,
        )[0];
        // ====================

        // Strategy step: Check if next session could be started.
        if (!currentSession || !strategy.canStartNextSession(currentSession)) {
            throw new BadRequestException(
                'Tous les matchs de la session en cours doivent être validés avant de lancer la suivante.',
            );
        }

        // Common step: Close current session
        const currentSessionClosed = await this.sessionRepo.updateStatus(
            currentSession,
            MatchesSessionStatus.CLOSED,
        );
        const tournamentWithSessionUpdated = updateTournamentWithUpdatedSession(
            tournament,
            currentSessionClosed,
        );

        // Common step: Generate new next session
        const newSession = await this.sessionRepo.save(
            this.sessionRepo.create({
                tournament: { id: tournamentId } as Tournament,
                sessionNumber: currentSession.sessionNumber + 1,
            }),
        );
        // Common step: emit session update
        this.gateway.emitSessionUpdated(tournamentCode, toSessionResponseDto(currentSessionClosed));
        // Common step: emit history update for just closed session
        await this.emitHistoryForSession(tournamentCode, currentSessionClosed);

        // Strategy step: Generate new session with match associated
        const tournamentWithMatches = appendMatchesSessionToTournament(
            tournamentWithSessionUpdated,
            newSession,
            await strategy.generateSessionMatches(tournamentWithSessionUpdated, newSession),
        );

        // ======= Common steps =======
        // data
        const newSessionMatches = tournamentWithMatches.matchsSessions.find(
            (s) => s.sessionNumber === newSession.sessionNumber,
        )!;
        // Common step: Emit new session data
        this.gateway.emitSessionUpdated(tournamentCode, toSessionResponseDto(newSessionMatches));
        // Common step: Emit match for every team in new session
        this.emitNewMatchForEachTeam(tournamentCode, newSessionMatches);

        // Common step: Emit new tournament information
        const tournamentStatusInfoForNextSession = await this.buildTournamentStatus(
            strategy,
            tournamentWithMatches,
        );
        this.gateway.emitTournamentUpdated(
            tournamentCode,
            toTournamentMetaDto(tournamentWithMatches, tournamentStatusInfoForNextSession),
        );

        return toAdminTournamentDto(
            sanitizeTournament(tournament),
            tournamentStatusInfoForNextSession,
        );
    }

    async completeTournament(code: string, password: string): Promise<AdminTournamentDto> {
        const tournament = await this.tournamentAuthService.findWithAdminAuth({ code }, password, {
            withTeams: true,
            withSessions: true,
        });

        // ==== Common data ====
        const tournamentCode = tournament.code;
        const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
        const openSession = tournament.matchsSessions.find(
            (s) => s.status === MatchesSessionStatus.OPEN,
        );
        // ====================

        // Strategy step: Check if tournament could be completed.
        if (!openSession || !strategy.canCompleteTournament(tournament)) {
            throw new BadRequestException(
                `Le tournoi et une session doivent être ACTIVE pour clôturer le tournoi. Statut actuel : "${tournament.status}".`,
            );
        }
        this.logger.log(
            `Tournament ${tournamentCode} completing — transitioning ACTIVE → COMPLETED`,
        );

        // Common step: Close last session
        const closedSession = await this.sessionRepo.updateStatus(
            openSession,
            MatchesSessionStatus.CLOSED,
        );
        const tounramentWithSessionUpdated = updateTournamentWithUpdatedSession(
            tournament,
            closedSession,
        );

        // Common step: emit updated session data
        this.gateway.emitSessionUpdated(tournamentCode, toSessionResponseDto(closedSession));
        // Common step: emit history update for just closed session
        await this.emitHistoryForSession(tournamentCode, closedSession);

        // Common step: Complete tournament
        const completedTournament = await this.tournamentRepo.updateStatus(
            tounramentWithSessionUpdated,
            TournamentStatus.COMPLETED,
        );

        // Common step: Emit new tournament information
        const statusAfterComplete = await this.buildTournamentStatus(strategy, completedTournament);
        this.gateway.emitTournamentUpdated(
            tournamentCode,
            toTournamentMetaDto(completedTournament, statusAfterComplete),
        );

        return toAdminTournamentDto(completedTournament, statusAfterComplete);
    }

    async getSessions(tournamentCode: string): Promise<SessionResponseDto[]> {
        const tournament = await this.tournamentRepo.findByCode(tournamentCode);
        if (!tournament) throw new NotFoundException('Tournoi introuvable');
        const sessions = await this.sessionRepo.findAllByTournament(tournament.id);
        return sessions.map(toSessionResponseDto);
    }

    async getSessionByNumber(
        tournamentCode: string,
        sessionNumber: number,
    ): Promise<SessionResponseDto> {
        const tournament = await this.tournamentRepo.findByCode(tournamentCode);
        if (!tournament) throw new NotFoundException('Tournoi introuvable');

        const session = await this.sessionRepo.findOneByTournamentAndNumber(
            tournament.id,
            sessionNumber,
        );
        if (!session) throw new NotFoundException('Session introuvable');
        return toSessionResponseDto(session);
    }

    public async buildTournamentStatus(
        strategy: TournamentStrategy | null,
        tournament: Tournament,
    ): Promise<TournamentStatusInfo | null> {
        try {
            const strat: TournamentStrategy =
                strategy || this.strategyFactory.create(tournament.configuration.competitionMode);
            const sessions =
                tournament.matchsSessions ||
                (await this.sessionRepo.findAllByTournament(tournament.id));
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
        if (teamCodes.size === 0) return;

        // One bulk lookup instead of one getTeamHistory() DB round trip per team — this
        // used to re-fetch the whole tournament + closed matches once per team involved in
        // the session (up to the full team count every round).
        const historyByTeamCode = await this.rankingService.getAllTeamsHistory(tournamentCode);
        for (const teamCode of teamCodes) {
            const history = (historyByTeamCode.get(teamCode) ?? []) as MatchHistoryDto[];
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
