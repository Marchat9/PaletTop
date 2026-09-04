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
        const [saved] = await this.trainingMatchRepo.save([match]);
        await this.trainingSessionRepo.touchLastActivity(session.id);
        return this.emitMatchUpdate(sessionCode, saved);
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
        const isFinished = scoreA === session.pointsPerGame || scoreB === session.pointsPerGame;

        match.scoreA = scoreA;
        match.scoreB = scoreB;
        match.status = isFinished ? MatchStatus.ENDED : MatchStatus.ONGOING;
        match.finishedAt = isFinished ? new Date() : null;

        const [saved] = await this.trainingMatchRepo.save([match]);
        await this.trainingSessionRepo.touchLastActivity(session.id);
        return this.emitMatchUpdate(sessionCode, saved);
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

        const [saved] = await this.trainingMatchRepo.save([match]);
        await this.trainingSessionRepo.touchLastActivity(session.id);
        return this.emitMatchUpdate(sessionCode, saved);
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
        const isFinished = scoreA === session.pointsPerGame || scoreB === session.pointsPerGame;

        match.scoreA = scoreA;
        match.scoreB = scoreB;
        match.status = this.nextStatusForAdminEdit(match.status, isFinished);
        match.finishedAt = isFinished ? (match.finishedAt ?? new Date()) : null;

        const [saved] = await this.trainingMatchRepo.save([match]);
        await this.trainingSessionRepo.touchLastActivity(session.id);
        return this.emitMatchUpdate(sessionCode, saved);
    }

    private async emitMatchUpdate(
        sessionCode: string,
        match: TrainingMatch,
    ): Promise<TrainingMatchDto> {
        const dto = toTrainingMatchDto(match);
        this.trainingRealtimeGateway.emitMatchUpdated(sessionCode, dto);
        if (match.status === MatchStatus.VALIDATED) {
            const leaderboard = await this.trainingLeaderboardService.getLeaderboard(sessionCode);
            this.trainingRealtimeGateway.emitLeaderboardUpdated(sessionCode, leaderboard);
        }
        return dto;
    }

    // Correction admin d'un score : un score qui atteint pointsPerGame valide le match ; sinon, un
    // match déjà ENDED/VALIDATED est rouvert en ONGOING (l'admin vient de le "dé-finir"), tout
    // autre statut (PENDING/ONGOING) reste inchangé.
    private nextStatusForAdminEdit(currentStatus: MatchStatus, isFinished: boolean): MatchStatus {
        if (isFinished) {
            return MatchStatus.VALIDATED;
        }
        if (currentStatus === MatchStatus.VALIDATED || currentStatus === MatchStatus.ENDED) {
            return MatchStatus.ONGOING;
        }
        return currentStatus;
    }

    private rejectBye(match: TrainingMatch): void {
        if (match.isBye) {
            throw new BadRequestException('Un match bye ne peut pas recevoir de score.');
        }
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
        const session = await this.trainingSessionRepo.findByCode(sessionCode);
        if (!session) {
            throw new NotFoundException('Session introuvable.');
        }

        const match = await this.trainingMatchRepo.findByIdInSession(matchId, session.id);
        if (!match) {
            throw new NotFoundException('Match introuvable.');
        }

        // Pas de filtre sur leftAt (cf. décision produit) : un participant dissous d'une équipe
        // fixe après avoir joué ce match précis doit pouvoir continuer à interagir avec lui.
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
