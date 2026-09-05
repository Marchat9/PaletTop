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
        // Écritures indépendantes (match vs session) : pas de raison de les sérialiser.
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
        // Un joueur peut renseigner un score sans être passé par startMatch au préalable (rien ne
        // l'impose côté produit) : startedAt doit malgré tout être posé dès que le match quitte
        // PENDING, sinon un match ONGOING/ENDED se retrouve avec une date de début à null.
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

        match.scoreA = scoreA;
        match.scoreB = scoreB;
        match.status = this.nextStatusForAdminEdit(isFinished);
        match.finishedAt = isFinished ? (match.finishedAt ?? new Date()) : null;
        // Une correction admin peut démarrer ou valider directement un match encore PENDING
        // (jamais démarré par un joueur) : startedAt doit malgré tout être posé, sinon un match
        // ONGOING/VALIDATED se retrouve avec une date de début à null pour toujours.
        if (!match.startedAt) {
            match.startedAt = isFinished ? match.finishedAt : new Date();
        }

        const [[saved]] = await Promise.all([
            this.trainingMatchRepo.save([match]),
            this.trainingSessionRepo.touchLastActivity(session.id),
        ]);
        return this.emitMatchUpdate(sessionCode, session.id, saved);
    }

    private async emitMatchUpdate(
        sessionCode: string,
        sessionId: string,
        match: TrainingMatch,
    ): Promise<TrainingMatchDto> {
        const dto = toTrainingMatchDto(match);
        this.trainingRealtimeGateway.emitMatchUpdated(sessionCode, dto);
        if (match.status === MatchStatus.VALIDATED) {
            // sessionId réutilisé depuis la session déjà chargée par l'appelant : pas besoin de la
            // re-résoudre par code rien que pour son id (cf. revue de code).
            const leaderboard =
                await this.trainingLeaderboardService.getLeaderboardBySessionId(sessionId);
            this.trainingRealtimeGateway.emitLeaderboardUpdated(sessionCode, leaderboard);
        }
        return dto;
    }

    // Correction admin d'un score : un score qui atteint pointsPerGame valide directement le
    // match (quel que soit son statut précédent, y compris PENDING jamais démarré par un joueur).
    // Sinon le match est/reste ONGOING : un match PENDING passe en cours (l'admin vient de lui
    // donner un score, un joueur ne doit plus pouvoir le "démarrer" par-dessus), et un match déjà
    // ENDED/VALIDATED est rouvert (l'admin vient de le "dé-finir").
    private nextStatusForAdminEdit(isFinished: boolean): MatchStatus {
        return isFinished ? MatchStatus.VALIDATED : MatchStatus.ONGOING;
    }

    private rejectBye(match: TrainingMatch): void {
        if (match.isBye) {
            throw new BadRequestException('Un match bye ne peut pas recevoir de score.');
        }
    }

    private isMatchFinished(scoreA: number, scoreB: number, pointsPerGame: number): boolean {
        return scoreA === pointsPerGame || scoreB === pointsPerGame;
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
