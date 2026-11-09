import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { MatchStatus, MatchesSessionStatus, TournamentStatus } from 'src/enum/status.enum';
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
import { RawScoreUpdateResult, ScoreUpdateResult } from '../responses/score.dto';
import { PlayerMatchDto } from '../responses/player-match.dto';
import { computeRanking } from '../utils/pool-ranking.utils';
import { ExpectedScore, isSameScore, staleScoreError } from 'src/utils/score-conflict.util';

const NOT_VALIDATED = [MatchStatus.PENDING, MatchStatus.ONGOING, MatchStatus.ENDED];

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

    async startMatch(code: string, matchId: string, teamCode: string): Promise<PlayerMatchDto> {
        const { match, tournament } = await this.findMatchWithTeamAuth(code, matchId, teamCode);
        this.assertPlayableByTeam(tournament.status, match);

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
        // The raw match carries the opponent's code, which is the proof asked at validation.
        return toPlayerMatchDto(updated);
    }

    async updateScore(
        code: string,
        matchId: string,
        teamCode: string,
        scoreA: number,
        scoreB: number,
        expectedScore: ExpectedScore | null = null,
    ): Promise<ScoreUpdateResult> {
        const { match, tournament } = await this.findMatchWithTeamAuth(code, matchId, teamCode);
        this.assertPlayableByTeam(tournament.status, match);

        if (match.status === MatchStatus.VALIDATED) {
            throw new BadRequestException(
                "Le score d'un match validé ne peut pas être modifié par une équipe.",
            );
        }
        if (expectedScore && !isSameScore(match, expectedScore)) {
            throw staleScoreError(this.logger, matchId, `tournament ${code}`);
        }

        const max = tournament.configuration.pointsPerGame;
        this.validateScores(scoreA, scoreB, max);

        const isFinished = scoreA >= max || scoreB >= max;

        const now = new Date();
        const updated = await this.matchRepo.updateIfStatus(
            matchId,
            NOT_VALIDATED,
            {
                scoreA,
                scoreB,
                status: isFinished ? MatchStatus.ENDED : MatchStatus.ONGOING,
                finishedAt: isFinished ? now : null,
                // Scored without being started first: it still needs a start date for its duration.
                ...(!match.startedAt && { startedAt: now }),
            },
            expectedScore,
        );
        if (!updated) {
            // Scored by the other team in the meantime, or validated by it: the latter must not
            // be reopened.
            const latest = await this.matchRepo.findByIdWithSession(matchId);
            if (expectedScore && latest?.status !== MatchStatus.VALIDATED) {
                throw staleScoreError(this.logger, matchId, `tournament ${code}`);
            }
            throw new BadRequestException(
                "Le match vient d'être validé : le score ne peut plus changer.",
            );
        }

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
        return toScoreUpdateResult(result);
    }

    async validateMatch(
        tournamentCode: string,
        matchId: string,
        teamCode: string,
        opponentTeamCode: string,
        expectedScore: ExpectedScore | null = null,
    ): Promise<ScoreUpdateResult> {
        const tournament = await this.tournamentRepo.findByCode(tournamentCode);
        if (!tournament) throw new NotFoundException('Tournoi introuvable.');

        const match = await this.matchRepo.findByIdInTournament(matchId, tournament.id);
        if (!match) throw new NotFoundException('Match introuvable.');

        if (match.status !== MatchStatus.ENDED) {
            throw new BadRequestException("Le match doit être terminé avant d'être validé.");
        }

        if (match.session?.status === MatchesSessionStatus.CLOSED) {
            throw new BadRequestException('Le round est déjà clôturé.');
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
        // The player validates the score on their screen: one they never saw is not confirmed.
        if (expectedScore && !isSameScore(match, expectedScore)) {
            throw staleScoreError(this.logger, matchId, 'validation');
        }

        const finishedAt = match.finishedAt ?? new Date();
        const duration = match.startedAt
            ? Math.round((finishedAt.getTime() - match.startedAt.getTime()) / 1000)
            : null;

        const validated = await this.matchRepo.updateIfStatus(
            matchId,
            [MatchStatus.ENDED],
            { status: MatchStatus.VALIDATED, finishedAt, duration },
            expectedScore,
        );
        // Two validations at once (both teams, or a double tap): only the first one goes through,
        // so the ranking is recomputed and broadcast once.
        if (!validated) {
            // Not validated meanwhile: the other team changed the score after it was read.
            const latest = await this.matchRepo.findByIdWithSession(matchId);
            if (expectedScore && latest && latest.status !== MatchStatus.VALIDATED) {
                throw staleScoreError(this.logger, matchId, 'validation');
            }
            throw new BadRequestException(
                'Le match a déjà été validé ou son score vient de changer.',
            );
        }

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
        return toScoreUpdateResult(result);
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

        const isFinished = scoreA >= max || scoreB >= max;
        // Reopened, the match would wait for a validation its closed session no longer accepts.
        if (wasSessionClosed && !isFinished) {
            throw new BadRequestException(
                `Le round de ce match est clôturé : le score corrigé doit rester final (${max} points pour une équipe).`,
            );
        }
        // The next rounds were built from this result (bracket, up-down tables): another winner
        // would leave them as they are, with the loser still playing on.
        if (wasSessionClosed && match.scoreA > match.scoreB !== scoreA > scoreB) {
            throw new BadRequestException(
                'Le round de ce match est clôturé : la correction ne peut pas changer le vainqueur.',
            );
        }
        const finishedAt = isFinished ? (match.finishedAt ?? new Date()) : null;
        const duration =
            isFinished && match.startedAt && finishedAt
                ? Math.round((finishedAt.getTime() - match.startedAt.getTime()) / 1000)
                : null;

        // A score below the target reopens a finished match, and starts a PENDING one: left PENDING
        // with a score, spectators saw "7-3 en attente" while the players could still "start" it.
        const newStatus = isFinished ? MatchStatus.VALIDATED : MatchStatus.ONGOING;

        await this.matchRepo.update(matchId, {
            scoreA,
            scoreB,
            status: newStatus,
            // null, not undefined: TypeORM skips undefined, so a reopened match kept its old end
            // date and the next validation reused it. The duration is only overwritten when known.
            finishedAt,
            ...(duration !== null && { duration }),
            ...(!match.startedAt && { startedAt: isFinished ? finishedAt : new Date() }),
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

        // Leaving VALIDATED takes the match out of the ranking too: it must be rebroadcast, or the
        // clients keep showing a win that no longer counts.
        const wasValidated = match.status === MatchStatus.VALIDATED;
        if (newStatus === MatchStatus.VALIDATED || wasValidated || wasSessionClosed) {
            this.rankingService.scheduleRankingUpdate(code);
        }

        await this.emitTournamentStatusOnValidationChange(
            code,
            match.session?.id,
            wasValidated,
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

        return toScoreUpdateResult(result);
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

    /**
     * A team plays only in an active tournament and an open session. An admin correction can
     * reopen an old match, but its teams must not take it over from there.
     */
    private assertPlayableByTeam(tournamentStatus: TournamentStatus, match: TournamentMatch): void {
        if (tournamentStatus !== TournamentStatus.ACTIVE) {
            throw new BadRequestException("Le tournoi n'est pas en cours.");
        }
        if (match.session?.status === MatchesSessionStatus.CLOSED) {
            throw new BadRequestException('Le round est déjà clôturé.');
        }
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
            status: TournamentStatus;
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
    ): Promise<RawScoreUpdateResult> {
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

function toScoreUpdateResult(result: RawScoreUpdateResult): ScoreUpdateResult {
    return { match: toPlayerMatchDto(result.match), ranking: result.ranking };
}
