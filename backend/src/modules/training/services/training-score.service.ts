import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TrainingMatch } from 'src/entities/training-match.entity';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingTeam } from 'src/entities/training-team.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { TrainingMatchRepository } from '../repositories/training-match.repository';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { TrainingMatchDto, toTrainingMatchDto } from '../responses/training-round.dto';
import { assertSessionOpen } from '../utils/session-guard.utils';
import { TrainingSessionAuthService } from './training-session-auth.service';
import { TrainingLeaderboardService } from './training-leaderboard.service';
import { TrainingRealtimeGateway } from '../training-realtime.gateway';

@Injectable()
export class TrainingScoreService {
    constructor(
        private readonly trainingMatchRepo: TrainingMatchRepository,
        private readonly trainingSessionRepo: TrainingSessionRepository,
        private readonly trainingSessionAuthService: TrainingSessionAuthService,
        private readonly trainingLeaderboardService: TrainingLeaderboardService,
        private readonly trainingRealtimeGateway: TrainingRealtimeGateway,
    ) {}

    async startMatch(
        sessionCode: string,
        matchId: string,
        participantCode: string,
    ): Promise<TrainingMatchDto> {
        const { match, session } = await this.findMatchWithParticipantAuth(
            sessionCode,
            matchId,
            participantCode,
        );
        assertSessionOpen(session);

        this.rejectBye(match);
        if (match.status !== MatchStatus.PENDING) {
            throw new BadRequestException('Le match est déjà démarré.');
        }

        match.status = MatchStatus.ONGOING;
        match.startedAt = new Date();
        // Independent writes (match vs session): no reason to serialize them.
        const [[saved]] = await Promise.all([
            this.trainingMatchRepo.save([match]),
            this.trainingSessionRepo.touchLastActivity(session.id),
        ]);
        return this.emitMatchUpdate(sessionCode, session.id, saved);
    }

    async updateScore(
        sessionCode: string,
        matchId: string,
        participantCode: string,
        scoreA: number,
        scoreB: number,
    ): Promise<TrainingMatchDto> {
        const { match, session } = await this.findMatchWithParticipantAuth(
            sessionCode,
            matchId,
            participantCode,
        );
        assertSessionOpen(session);

        this.rejectBye(match);
        if (match.status === MatchStatus.VALIDATED) {
            throw new BadRequestException(
                "Le score d'un match validé ne peut pas être modifié par un joueur.",
            );
        }

        this.validateScores(scoreA, scoreB, session.pointsPerGame);
        const isFinished = this.isMatchFinished(scoreA, scoreB, session.pointsPerGame);

        match.scoreA = scoreA;
        match.scoreB = scoreB;
        match.status = isFinished ? MatchStatus.ENDED : MatchStatus.ONGOING;
        match.finishedAt = isFinished ? new Date() : null;
        // A player can enter a score without having gone through startMatch first (nothing forces
        // it product-wise): startedAt must still be set as soon as the match leaves PENDING,
        // otherwise an ONGOING/ENDED match ends up with a null start date.
        if (!match.startedAt) {
            match.startedAt = new Date();
        }

        const [[saved]] = await Promise.all([
            this.trainingMatchRepo.save([match]),
            this.trainingSessionRepo.touchLastActivity(session.id),
        ]);
        return this.emitMatchUpdate(sessionCode, session.id, saved);
    }

    async validateMatch(
        sessionCode: string,
        matchId: string,
        participantCode: string,
        opponentParticipantCode: string,
    ): Promise<TrainingMatchDto> {
        const { match, session } = await this.findMatchWithParticipantAuth(
            sessionCode,
            matchId,
            participantCode,
        );

        this.rejectBye(match);
        if (match.status !== MatchStatus.ENDED) {
            throw new BadRequestException("Le match doit être terminé avant d'être validé.");
        }

        const isParticipantOnTeamA = this.hasParticipantCode(match.teamA, participantCode);
        const opponentTeam = isParticipantOnTeamA ? match.teamB : match.teamA;
        if (!opponentTeam || !this.hasParticipantCode(opponentTeam, opponentParticipantCode)) {
            throw new BadRequestException('Code participant adverse incorrect.');
        }

        match.status = MatchStatus.VALIDATED;
        match.finishedAt = match.finishedAt ?? new Date();

        const [[saved]] = await Promise.all([
            this.trainingMatchRepo.save([match]),
            this.trainingSessionRepo.touchLastActivity(session.id),
        ]);
        return this.emitMatchUpdate(sessionCode, session.id, saved);
    }

    async adminUpdateScore(
        sessionCode: string,
        matchId: string,
        password: string,
        scoreA: number,
        scoreB: number,
    ): Promise<TrainingMatchDto> {
        const session = await this.trainingSessionAuthService.findWithAdminAuth(
            sessionCode,
            password,
        );
        const match = await this.trainingMatchRepo.findByIdInSession(matchId, session.id);
        if (!match) {
            throw new NotFoundException('Match introuvable.');
        }
        this.rejectBye(match);

        this.validateScores(scoreA, scoreB, session.pointsPerGame);
        const isFinished = this.isMatchFinished(scoreA, scoreB, session.pointsPerGame);

        const wasValidated = match.status === MatchStatus.VALIDATED;

        match.scoreA = scoreA;
        match.scoreB = scoreB;
        match.status = this.nextStatusForAdminEdit(isFinished);
        match.finishedAt = isFinished ? (match.finishedAt ?? new Date()) : null;
        // An admin correction can start or validate a match that is still PENDING (never started by
        // a player): startedAt must still be set, otherwise an ONGOING/VALIDATED match keeps a null
        // start date for ever.
        if (!match.startedAt) {
            match.startedAt = isFinished ? match.finishedAt : new Date();
        }

        const [[saved]] = await Promise.all([
            this.trainingMatchRepo.save([match]),
            this.trainingSessionRepo.touchLastActivity(session.id),
        ]);
        // Reopening a validated match removes its points from the leaderboard: it must be
        // rebroadcast on the way out of VALIDATED too, not only on the way in - otherwise clients
        // keep showing points that no longer count.
        return this.emitMatchUpdate(sessionCode, session.id, saved, wasValidated);
    }

    private async emitMatchUpdate(
        sessionCode: string,
        sessionId: string,
        match: TrainingMatch,
        wasValidated = false,
    ): Promise<TrainingMatchDto> {
        const dto = toTrainingMatchDto(match);
        this.trainingRealtimeGateway.emitMatchUpdated(sessionCode, dto);
        if (match.status === MatchStatus.VALIDATED || wasValidated) {
            // sessionId reused from the session already loaded by the caller: no need to resolve it
            // by code just for its id.
            const leaderboard =
                await this.trainingLeaderboardService.getLeaderboardBySessionId(sessionId);
            this.trainingRealtimeGateway.emitLeaderboardUpdated(sessionCode, leaderboard);
        }
        return dto;
    }

    // Admin correction of a score: a score that reaches pointsPerGame validates the match directly
    // (whatever its previous status, including PENDING never started by a player). Otherwise the
    // match is or stays ONGOING: a PENDING match becomes ongoing (the admin has just given it a
    // score, a player must no longer be able to "start" it on top of that), and a match already
    // ENDED/VALIDATED is reopened.
    private nextStatusForAdminEdit(isFinished: boolean): MatchStatus {
        return isFinished ? MatchStatus.VALIDATED : MatchStatus.ONGOING;
    }

    private rejectBye(match: TrainingMatch): void {
        if (match.isBye) {
            throw new BadRequestException('Un match bye ne peut pas recevoir de score.');
        }
    }

    private isMatchFinished(scoreA: number, scoreB: number, pointsPerGame: number): boolean {
        return scoreA >= pointsPerGame || scoreB >= pointsPerGame;
    }

    private validateScores(scoreA: number, scoreB: number, max: number): void {
        if (scoreA > max || scoreB > max || (scoreA === max && scoreB === max)) {
            throw new BadRequestException(
                `Les scores ne peuvent pas dépasser ${max} points par partie et les deux équipes ne peuvent pas avoir ${max} points toutes les deux.`,
            );
        }
    }

    private hasParticipantCode(team: TrainingTeam, code: string): boolean {
        return (team.members ?? []).some((m) => m.participant.code === code);
    }

    private async findMatchWithParticipantAuth(
        sessionCode: string,
        matchId: string,
        participantCode: string,
    ): Promise<{ match: TrainingMatch; session: TrainingSession }> {
        const session = await this.trainingSessionRepo.findByCodeOrThrow(sessionCode);

        const match = await this.trainingMatchRepo.findByIdInSession(matchId, session.id);
        if (!match) {
            throw new NotFoundException('Match introuvable.');
        }

        // No filter on leftAt (product decision): a participant detached from a fixed team after
        // playing this very match must still be able to interact with it.
        const isOnTeamA = this.hasParticipantCode(match.teamA, participantCode);
        const isOnTeamB = match.teamB
            ? this.hasParticipantCode(match.teamB, participantCode)
            : false;
        if (!isOnTeamA && !isOnTeamB) {
            throw new BadRequestException('Code participant invalide pour ce match.');
        }

        return { match, session };
    }
}
