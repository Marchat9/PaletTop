import { Injectable, NotFoundException } from '@nestjs/common';
import { TrainingParticipant } from 'src/entities/training-participant.entity';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingTeam } from 'src/entities/training-team.entity';
import { TrainingMatchRepository } from '../repositories/training-match.repository';
import { TrainingRoundRepository } from '../repositories/training-round.repository';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { TrainingCurrentMatchDto } from '../responses/training-current-match.dto';
import { TrainingMatchDto, toTrainingMatchDto } from '../responses/training-round.dto';

@Injectable()
export class TrainingParticipantViewService {
    constructor(
        private readonly trainingSessionRepo: TrainingSessionRepository,
        private readonly trainingRoundRepo: TrainingRoundRepository,
        private readonly trainingMatchRepo: TrainingMatchRepository,
    ) {}

    async getCurrentMatch(
        sessionCode: string,
        participantCode: string,
    ): Promise<TrainingCurrentMatchDto> {
        const { session, participant } = await this.findParticipantOrThrow(
            sessionCode,
            participantCode,
        );

        const identity = { id: participant.id, name: participant.name };

        const latestRound = await this.trainingRoundRepo.findLatestBySession(session.id);
        if (!latestRound) {
            return { participant: identity, match: null, roundNumber: null, sitOut: false };
        }

        const match = (latestRound.matches ?? []).find(
            (m) =>
                this.hasParticipant(m.teamA, participant.id) ||
                (m.teamB && this.hasParticipant(m.teamB, participant.id)),
        );
        // Inscrit après la génération du round : il n'y figure pas encore et entrera au suivant.
        if (!match) {
            return {
                participant: identity,
                match: null,
                roundNumber: latestRound.roundNumber,
                sitOut: true,
            };
        }

        // Un match sans adversaire est un repos, que le participant y soit seul (surnuméraire)
        // ou avec son équipe (nombre impair d'équipes) : `sitOut` couvre les deux cas.
        return {
            participant: identity,
            match: toTrainingMatchDto(match),
            roundNumber: latestRound.roundNumber,
            sitOut: match.isBye,
        };
    }

    async getHistory(sessionCode: string, participantCode: string): Promise<TrainingMatchDto[]> {
        const { session, participant } = await this.findParticipantOrThrow(
            sessionCode,
            participantCode,
        );

        const matches = await this.trainingMatchRepo.findByParticipant(session.id, participant.id);
        return matches.map(toTrainingMatchDto);
    }

    private hasParticipant(team: TrainingTeam, participantId: string): boolean {
        return (team.members ?? []).some((m) => m.participant.id === participantId);
    }

    private async findParticipantOrThrow(
        sessionCode: string,
        participantCode: string,
    ): Promise<{ session: TrainingSession; participant: TrainingParticipant }> {
        const session = await this.trainingSessionRepo.findByCodeOrThrow(sessionCode);
        const participant = session.participants.find((p) => p.code === participantCode);
        if (!participant) {
            throw new NotFoundException('Code participant invalide pour cette session.');
        }
        return { session, participant };
    }
}
