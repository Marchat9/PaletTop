import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingParticipant } from 'src/entities/training-participant.entity';
import { TrainingParticipantStatus, TrainingSessionStatus } from 'src/enum/training.enum';

export interface TrainingParticipantPublicDto {
    id: string;
    name: string;
    status: TrainingParticipantStatus;
}

// Réservé aux réponses admin (mot de passe vérifié) : porte le code perso du participant, à ne
// JAMAIS inclure dans une vue publique (il sert d'authentification joueur, cf. décision produit).
export interface TrainingParticipantAdminDto extends TrainingParticipantPublicDto {
    code: string;
    memberId?: string;
}

interface TrainingSessionFieldsDto {
    id: string;
    code: string;
    date: string;
    status: TrainingSessionStatus;
    playersPerTeam: number;
    fallbackTeamSize: number;
    allowSitOut: boolean;
    avoidSamePartnerConsecutive: boolean;
    avoidSameOpponentConsecutive: boolean;
    pointsPerGame: number;
    closedAt?: string;
    createdAt: string;
}

export interface TrainingSessionPublicDto extends TrainingSessionFieldsDto {
    participants: TrainingParticipantPublicDto[];
}

export interface TrainingSessionAdminDto extends TrainingSessionFieldsDto {
    participants: TrainingParticipantAdminDto[];
}

export function toTrainingParticipantPublicDto(
    participant: TrainingParticipant,
): TrainingParticipantPublicDto {
    return { id: participant.id, name: participant.name, status: participant.status };
}

export function toTrainingParticipantAdminDto(
    participant: TrainingParticipant,
): TrainingParticipantAdminDto {
    return {
        ...toTrainingParticipantPublicDto(participant),
        code: participant.code,
        memberId: participant.member?.id,
    };
}

function baseSessionFields(session: TrainingSession): TrainingSessionFieldsDto {
    return {
        id: session.id,
        code: session.code,
        date: session.date.toISOString(),
        status: session.status,
        playersPerTeam: session.playersPerTeam,
        fallbackTeamSize: session.fallbackTeamSize,
        allowSitOut: session.allowSitOut,
        avoidSamePartnerConsecutive: session.avoidSamePartnerConsecutive,
        avoidSameOpponentConsecutive: session.avoidSameOpponentConsecutive,
        pointsPerGame: session.pointsPerGame,
        closedAt: session.closedAt?.toISOString(),
        createdAt: session.createdAt.toISOString(),
    };
}

export function toTrainingSessionPublicDto(session: TrainingSession): TrainingSessionPublicDto {
    return {
        ...baseSessionFields(session),
        participants: (session.participants ?? []).map(toTrainingParticipantPublicDto),
    };
}

export function toTrainingSessionAdminDto(session: TrainingSession): TrainingSessionAdminDto {
    return {
        ...baseSessionFields(session),
        participants: (session.participants ?? []).map(toTrainingParticipantAdminDto),
    };
}
