import { AdminTrainingSearchItem } from 'src/modules/training/repositories/training.repository';

export interface SuperAdminTrainingSummaryDto {
    id: string;
    code: string;
    name: string;
    description?: string;
    sessionsCount: number;
    openSessionsCount: number;
    createdAt: string;
}

export function toSuperAdminTrainingSummaryDto(
    training: AdminTrainingSearchItem,
): SuperAdminTrainingSummaryDto {
    return {
        id: training.id,
        code: training.code,
        name: training.name,
        description: training.description,
        sessionsCount: training.sessionsCount,
        openSessionsCount: training.openSessionsCount,
        createdAt: training.createdAt.toISOString(),
    };
}
