import { Training } from 'src/entities/training.entity';

export interface SuperAdminTrainingSummaryDto {
    id: string;
    code: string;
    name: string;
    description?: string;
    sessionsCount: number;
    createdAt: string;
}

export function toSuperAdminTrainingSummaryDto(
    training: Training & { sessionsCount: number },
): SuperAdminTrainingSummaryDto {
    return {
        id: training.id,
        code: training.code,
        name: training.name,
        description: training.description,
        sessionsCount: training.sessionsCount,
        createdAt: training.createdAt.toISOString(),
    };
}
