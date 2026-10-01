import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingParticipant } from 'src/entities/training-participant.entity';
import { TrainingTeam } from 'src/entities/training-team.entity';
import {
    TrainingParticipantStatus,
    TrainingSessionStatus,
    TrainingTeamComposition,
    TrainingTeamKind,
} from 'src/enum/training.enum';
import { activeMembers, isActiveMember } from '../utils/team-member.utils';

export interface TrainingParticipantPublicDto {
    id: string;
    name: string;
    status: TrainingParticipantStatus;
}

export interface TrainingParticipantAdminDto extends TrainingParticipantPublicDto {
    code: string;
    memberId?: string;
}

export interface TrainingTeamMemberSummaryDto {
    id: string;
    name: string;
}

export interface TrainingTeamDto {
    id: string;
    kind: TrainingTeamKind;
    name?: string;
    members: TrainingTeamMemberSummaryDto[];
}

export function toTrainingTeamDto(team: TrainingTeam, activeOnly = true): TrainingTeamDto {
    const members = activeOnly ? activeMembers(team.members) : (team.members ?? []);
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
    allowedTeamSizes: number[];
    preferTargetTeamSize: boolean;
    plateCount: number;
    teamComposition: TrainingTeamComposition;
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
    trainingCode: string;
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
        allowedTeamSizes: session.allowedTeamSizes,
        preferTargetTeamSize: session.preferTargetTeamSize,
        plateCount: session.plateCount,
        teamComposition: session.teamComposition,
        avoidSamePartnerConsecutive: session.avoidSamePartnerConsecutive,
        avoidSameOpponentConsecutive: session.avoidSameOpponentConsecutive,
        pointsPerGame: session.pointsPerGame,
        closedAt: session.closedAt?.toISOString(),
        createdAt: session.createdAt.toISOString(),
    };
}

// A FIXED team that has been fully dissolved has no active member left: it is no longer listed
// among the session teams (it stays in the database only as a historical anchor for the matches
// already played).
function activeTeams(session: TrainingSession): TrainingTeam[] {
    return (session.teams ?? []).filter((team) => team.members?.some(isActiveMember));
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
        trainingCode: session.training.code,
        participants: (session.participants ?? []).map(toTrainingParticipantAdminDto),
        teams: activeTeams(session).map((team) => toTrainingTeamDto(team)),
    };
}

export interface TrainingSessionSummaryDto {
    code: string;
    date: string;
    status: TrainingSessionStatus;
    participantsCount: number;
}

export function toTrainingSessionSummaryDto(session: TrainingSession): TrainingSessionSummaryDto {
    return {
        code: session.code,
        date: session.date.toISOString(),
        status: session.status,
        participantsCount: (session.participants ?? []).length,
    };
}
