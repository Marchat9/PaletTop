import { Training } from 'src/entities/training.entity';
import { TrainingMember } from 'src/entities/training-member.entity';

export interface TrainingMemberDto {
    id: string;
    name: string;
    // Participant code the member keeps for every session of the club (admin only).
    code: string;
}

export interface AdminTrainingDto {
    id: string;
    code: string;
    name: string;
    description?: string;
    createdAt: string;
    members: TrainingMemberDto[];
    adminMemberId: string | null;
}

export function toTrainingMemberDto(member: TrainingMember): TrainingMemberDto {
    return { id: member.id, name: member.name, code: member.code };
}

export function toAdminTrainingDto(training: Training): AdminTrainingDto {
    return {
        id: training.id,
        code: training.code,
        name: training.name,
        description: training.description,
        createdAt: training.createdAt.toISOString(),
        members: (training.members ?? []).map(toTrainingMemberDto),
        adminMemberId: training.adminMemberId ?? null,
    };
}
