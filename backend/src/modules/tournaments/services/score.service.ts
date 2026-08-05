import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { MatchStatus, MatchesSessionStatus } from 'src/enum/status.enum';
import { ScoreCalculation } from 'src/enum/tounament.enum';
import { RealtimeGateway } from 'src/modules/realtime/realtime.gateway';
import { TournamentAuthService } from 'src/modules/tournaments/services/tournament-auth.service';
import { TournamentRepository } from 'src/modules/tournaments/repositories/tournament.repository';
import { toTournamentMetaDto } from 'src/modules/tournaments/responses/admin-tournament.dto';
import { toPlayerMatchDto } from '../responses/player-match.dto';
import { RankingService } from './ranking.service';
import { MatchRepository } from '../repositories/match.repository';
import { PoolRepository } from '../repositories/pool.repository';
import { SessionRepository } from '../repositories/session.repository';
import { TournamentStrategyFactory } from '../strategies/tournament-strategy.factory';
import { ScoreUpdateResult } from '../responses/score.dto';
import { computeRanking } from '../utils/pool-ranking.utils';

@Injectable()
export class ScoreService {
    private readonly logger = new Logger(ScoreService.name);

    constructor(
        private readonly tournamentRepo: TournamentRepository,
        private readonly matchRepo: MatchRepository,
        private readonly poolRepo: PoolRepository,
        private readonly sessionRepo: SessionRepository,
        private readonly rankingService: RankingService,
        private readonly tournamentAuthService: TournamentAuthService,
        private readonly gateway: RealtimeGateway,
        private readonly strategyFactory: TournamentStrategyFactory,
    ) {}

    async startMatch(code: string, matchId: string, teamCode: string): Promise<TournamentMatch> {
        const { match } = await this.findMatchWithTeamAuth(code, matchId, teamCode);

        if (match.status !== MatchStatus.PENDING) {
            throw new BadRequestException('Le match est déjà démarré.');
        }

        await this.matchRepo.update(matchId, {
            status: MatchStatus.ONGOING,
            startedAt: new Date(),
        });

        const updated = await this.matchRepo.findByIdWithSession(matchId);
        if (!updated) throw new NotFoundException('Match introuvable après démarrage.');

        this.logger.log(`Match ${matchId} started (tournament: ${code}, team: ${teamCode})`);
        this.gateway.emitMatchUpdated(
            code,
            updated.teamA.code,
            updated.teamB?.code ?? null,
            toPlayerMatchDto(updated),
        );
        return updated;
    }

    async updateScore(
        code: string,
        matchId: string,
        teamCode: string,
        scoreA: number,
        scoreB: number,
    ): Promise<ScoreUpdateResult> {
        const { match, tournament } = await this.findMatchWithTeamAuth(code, matchId, teamCode);

        if (match.status === MatchStatus.VALIDATED) {
            throw new BadRequestException(
                "Le score d'un match validé ne peut pas être modifié par une équipe.",
            );
        }

        const max = tournament.configuration.pointsPerGame;
        this.validateScores(scoreA, scoreB, max);

        const isFinished = scoreA === max || scoreB === max;

        await this.matchRepo.update(matchId, {
            scoreA,
            scoreB,
            status: isFinished ? MatchStatus.ENDED : MatchStatus.ONGOING,
            finishedAt: isFinished ? new Date() : null,
        });

        const result = await this.buildScoreUpdateResult(
            matchId,
            match.pool?.id,
            tournament.configuration.scoreCalculation,
        );
        this.gateway.emitMatchUpdated(
            code,
            result.match.teamA.code,
            result.match.teamB?.code ?? null,
            toPlayerMatchDto(result.match),
        );
        return result;
    }

    async validateMatch(
        tournamentCode: string,
        matchId: string,
        teamCode: string,
        opponentTeamCode: string,
    ): Promise<ScoreUpdateResult> {
        const tournament = await this.tournamentRepo.findByCode(tournamentCode);
        if (!tournament) throw new NotFoundException('Tournoi introuvable.');

        const match = await this.matchRepo.findByIdInTournament(matchId, tournament.id);
        if (!match) throw new NotFoundException('Match introuvable.');

        if (match.status !== MatchStatus.ENDED) {
            throw new BadRequestException("Le match doit être terminé avant d'être validé.");
        }

        if (match.session?.status === MatchesSessionStatus.CLOSED) {
            throw new BadRequestException('La session est déjà clôturée.');
        }

        const isTeamA = match.teamA?.code === teamCode;
        const isTeamB = match.teamB?.code === teamCode;

        if (!isTeamA && !isTeamB) {
            throw new BadRequestException('Code équipe invalide pour ce match.');
        }

        const expectedOpponent = isTeamA ? match.teamB?.code : match.teamA?.code;
        if (opponentTeamCode !== expectedOpponent) {
            throw new BadRequestException('Code équipe adverse incorrect.');
        }

        const finishedAt = match.finishedAt ?? new Date();
        const duration = match.startedAt
            ? Math.round((finishedAt.getTime() - match.startedAt.getTime()) / 1000)
            : null;

        await this.matchRepo.update(matchId, {
            status: MatchStatus.VALIDATED,
            finishedAt,
            duration,
        });

        const result = await this.buildScoreUpdateResult(
            matchId,
            match.pool?.id,
            tournament.configuration.scoreCalculation,
        );
        this.logger.log(`Match ${matchId} validated (tournament: ${tournamentCode})`);
        this.gateway.emitMatchUpdated(
            tournamentCode,
            result.match.teamA.code,
            result.match.teamB?.code ?? null,
            toPlayerMatchDto(result.match),
        );
        this.rankingService.scheduleRankingUpdate(tournamentCode);
        await this.emitTournamentStatusOnValidationChange(
            tournamentCode,
            match.session?.id,
            false,
            MatchStatus.VALIDATED,
        );
        return result;
    }

    async adminUpdateScore(
        code: string,
        matchId: string,
        password: string,
        scoreA: number,
        scoreB: number,
    ): Promise<ScoreUpdateResult> {
        const { match, tournament } = await this.findMatchWithAdminAuth(code, matchId, password);

        const wasSessionClosed = match.session?.status === MatchesSessionStatus.CLOSED;

        const max = tournament.configuration.pointsPerGame;
        this.validateScores(scoreA, scoreB, max);

        const isFinished = scoreA === max || scoreB === max;
        const finishedAt = isFinished ? (match.finishedAt ?? new Date()) : null;
        const duration =
            isFinished && match.startedAt && finishedAt
                ? Math.round((finishedAt.getTime() - match.startedAt.getTime()) / 1000)
                : null;

        const newStatus = isFinished
            ? MatchStatus.VALIDATED
            : match.status === MatchStatus.VALIDATED || match.status === MatchStatus.ENDED
              ? MatchStatus.ONGOING
              : match.status;

        await this.matchRepo.update(matchId, {
            scoreA,
            scoreB,
            status: newStatus,
            finishedAt: finishedAt ?? undefined,
            ...(duration !== null && { duration }),
        });

        const result = await this.buildScoreUpdateResult(
            matchId,
            match.pool?.id,
            tournament.configuration.scoreCalculation,
        );
        this.logger.log(
            `Admin force-updated score for match ${matchId} (tournament: ${code}, ${scoreA}-${scoreB})`,
        );
        this.gateway.emitMatchUpdated(
            code,
            result.match.teamA.code,
            result.match.teamB?.code ?? null,
            toPlayerMatchDto(result.match),
        );

        if (newStatus === MatchStatus.VALIDATED || wasSessionClosed) {
            this.rankingService.scheduleRankingUpdate(code);
        }

        await this.emitTournamentStatusOnValidationChange(
            code,
            match.session?.id,
            match.status === MatchStatus.VALIDATED,
            newStatus,
        );

        if (wasSessionClosed) {
            const teams = [match.teamA, match.teamB].filter(Boolean);
            for (const team of teams) {
                if (team?.code) {
                    const history = await this.rankingService.getTeamHistory(code, team.code);
                    this.gateway.emitHistoryUpdated(code, team.code, history);
                }
            }
        }

        return result;
    }

    private async emitTournamentStatusOnValidationChange(
        tournamentCode: string,
        sessionId: string | undefined,
        wasValidated: boolean,
        newStatus: MatchStatus,
    ): Promise<void> {
        if (!sessionId) return;

        const becameValidated = newStatus === MatchStatus.VALIDATED;
        const regressionFromValidated = wasValidated && !becameValidated;
        if (!becameValidated && !regressionFromValidated) return;

        const session = await this.sessionRepo.findByIdWithMatches(sessionId);
        if (!session || session.status !== MatchesSessionStatus.OPEN) return;

        if (becameValidated && !session.matches.every((m) => m.status === MatchStatus.VALIDATED))
            return;

        const tournament = await this.tournamentRepo.findWithRelations(
            { code: tournamentCode },
            { withTeams: true },
        );
        if (!tournament) return;

        const allSessions = await this.sessionRepo.findAllByTournament(tournament.id);
        const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
        const tournamentStatus = strategy.computeTournamentStatus(tournament, allSessions);
        this.gateway.emitTournamentUpdated(
            tournamentCode,
            toTournamentMetaDto(tournament, tournamentStatus),
        );
    }

    private validateScores(scoreA: number, scoreB: number, max: number): void {
        if (scoreA > max || scoreB > max || (scoreA === max && scoreB === max)) {
            throw new BadRequestException(
                `Les scores ne peuvent pas dépasser ${max} points par partie et les deux équipes ne peuvent pas avoir ${max} points toutes les deux.`,
            );
        }
    }

    private async findMatchWithTeamAuth(
        code: string,
        matchId: string,
        teamCode: string,
    ): Promise<{
        match: TournamentMatch;
        tournament: {
            configuration: { pointsPerGame: number; scoreCalculation: ScoreCalculation };
        };
    }> {
        const tournament = await this.tournamentRepo.findByCode(code);
        if (!tournament) throw new NotFoundException('Tournoi introuvable.');

        const match = await this.matchRepo.findByIdInTournament(matchId, tournament.id);
        if (!match) throw new NotFoundException('Match introuvable.');

        const isTeamA = match.teamA?.code === teamCode;
        const isTeamB = match.teamB?.code === teamCode;
        if (!isTeamA && !isTeamB) {
            throw new BadRequestException('Code équipe invalide pour ce match.');
        }

        return { match, tournament };
    }

    private async findMatchWithAdminAuth(
        code: string,
        matchId: string,
        password: string,
    ): Promise<{
        match: TournamentMatch;
        tournament: {
            configuration: { pointsPerGame: number; scoreCalculation: ScoreCalculation };
        };
    }> {
        const tournament = await this.tournamentAuthService.findWithAdminAuth({ code }, password);
        const match = await this.matchRepo.findByIdInTournament(matchId, tournament.id);
        if (!match) throw new NotFoundException('Match introuvable.');
        return { match, tournament };
    }

    private async buildScoreUpdateResult(
        matchId: string,
        poolId: string | null | undefined,
        scoreCalculation: ScoreCalculation,
    ): Promise<ScoreUpdateResult> {
        const match = await this.matchRepo.findByIdWithSession(matchId);
        if (!match) throw new NotFoundException('Match introuvable après mise à jour.');

        if (!poolId) return { match, ranking: [] };

        const pool = await this.poolRepo.findByIdWithTeams(poolId);
        if (!pool) return { match, ranking: [] };

        const poolMatches = await this.matchRepo.findByPool(poolId);
        const ranking = computeRanking(pool.teams, poolMatches, scoreCalculation);
        return { match, ranking };
    }
}
