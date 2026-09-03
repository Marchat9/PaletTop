import { Training } from 'src/entities/training.entity';
import {
    TrainingMemberDto,
    toTrainingMemberDto,
} from 'src/modules/training/responses/admin-training.dto';
import {
    TrainingSessionSummaryDto,
    toTrainingSessionSummaryDto,
} from 'src/modules/training/responses/training-session.dto';

export interface SuperAdminTrainingDetailDto {
    id: string;
    code: string;
    name: string;
    club?: string;
    createdAt: string;
    members: TrainingMemberDto[];
    sessions: TrainingSessionSummaryDto[];
}

export function toSuperAdminTrainingDetailDto(training: Training): SuperAdminTrainingDetailDto {
    return {
        id: training.id,
        code: training.code,
        name: training.name,
        club: training.club,
        createdAt: training.createdAt.toISOString(),
        members: (training.members ?? []).map(toTrainingMemberDto),
        sessions: (training.sessions ?? []).map(toTrainingSessionSummaryDto),
    };
}
