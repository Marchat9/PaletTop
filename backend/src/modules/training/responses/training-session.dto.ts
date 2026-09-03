import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingParticipant } from 'src/entities/training-participant.entity';
import { TrainingTeam } from 'src/entities/training-team.entity';
import {
    TrainingParticipantStatus,
    TrainingSessionStatus,
    TrainingTeamKind,
} from 'src/enum/training.enum';

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

export interface TrainingTeamMemberSummaryDto {
    id: string;
    name: string;
}

// Composition d'équipe (noms) : pas sensible, partagée entre vues publique et admin — seul le
// code personnel du participant (TrainingParticipantAdminDto) est réservé à l'admin.
export interface TrainingTeamDto {
    id: string;
    kind: TrainingTeamKind;
    name?: string;
    members: TrainingTeamMemberSummaryDto[];
}

// `activeOnly` distingue deux usages : la liste "équipes de la session" doit refléter la
// composition ACTUELLE (donc filtrer les membres partis) ; l'affichage d'un match (round detail,
// current-match, history) doit montrer QUI A JOUÉ ce match précis, même si l'équipe a depuis été
// dissoute — sinon un match validé se retrouve affiché avec une équipe vide (score correct, mais
// plus aucun nom), alors que le classement (qui n'agrège jamais avec ce filtre) reste, lui, exact.
export function toTrainingTeamDto(team: TrainingTeam, activeOnly = true): TrainingTeamDto {
    const members = activeOnly
        ? (team.members ?? []).filter((m) => !m.leftAt)
        : (team.members ?? []);
    return {
        id: team.id,
        kind: team.kind,
        name: team.name,
        members: members.map((m) => ({ id: m.participant.id, name: m.participant.name })),
    };
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
    teams: TrainingTeamDto[];
}

export interface TrainingSessionAdminDto extends TrainingSessionFieldsDto {
    participants: TrainingParticipantAdminDto[];
    teams: TrainingTeamDto[];
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

// Une équipe FIXED entièrement dissoute n'a plus aucun membre actif : on ne l'affiche plus dans
// la liste des équipes de la session (elle reste en base uniquement comme ancrage historique
// pour les matchs déjà joués, cf. décision produit sur la dissolution non destructive).
function activeTeams(session: TrainingSession): TrainingTeam[] {
    return (session.teams ?? []).filter((team) => team.members?.some((m) => !m.leftAt));
}

export function toTrainingSessionPublicDto(session: TrainingSession): TrainingSessionPublicDto {
    return {
        ...baseSessionFields(session),
        participants: (session.participants ?? []).map(toTrainingParticipantPublicDto),
        teams: activeTeams(session).map((team) => toTrainingTeamDto(team)),
    };
}

export function toTrainingSessionAdminDto(session: TrainingSession): TrainingSessionAdminDto {
    return {
        ...baseSessionFields(session),
        participants: (session.participants ?? []).map(toTrainingParticipantAdminDto),
        teams: activeTeams(session).map((team) => toTrainingTeamDto(team)),
    };
}
