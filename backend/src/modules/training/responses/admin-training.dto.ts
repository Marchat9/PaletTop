import { Training } from 'src/entities/training.entity';
import { TrainingMember } from 'src/entities/training-member.entity';

export interface TrainingMemberDto {
    id: string;
    name: string;
}

export interface AdminTrainingDto {
    id: string;
    code: string;
    name: string;
    club?: string;
    createdAt: string;
    members: TrainingMemberDto[];
}

export function toTrainingMemberDto(member: TrainingMember): TrainingMemberDto {
    return { id: member.id, name: member.name };
}

export function toAdminTrainingDto(training: Training): AdminTrainingDto {
    return {
        id: training.id,
        code: training.code,
        name: training.name,
        club: training.club,
        createdAt: training.createdAt.toISOString(),
        members: (training.members ?? []).map(toTrainingMemberDto),
    };
}
