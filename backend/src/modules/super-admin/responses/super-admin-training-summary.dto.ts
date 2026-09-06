import { Training } from 'src/entities/training.entity';

export interface SuperAdminTrainingSummaryDto {
    id: string;
    code: string;
    name: string;
    club?: string;
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
        club: training.club,
        sessionsCount: training.sessionsCount,
        createdAt: training.createdAt.toISOString(),
    };
}
