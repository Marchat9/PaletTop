import { describe, expect, it } from 'vitest';
import { TournamentStatus } from 'src/enum/status.enum';
import { toMetricsDto } from './metrics.dto';

describe('toMetricsDto', () => {
    it('sums the per-status counts into a total', () => {
        const dto = toMetricsDto(
            {
                [TournamentStatus.DRAFT]: 2,
                [TournamentStatus.ACTIVE]: 3,
                [TournamentStatus.COMPLETED]: 7,
                [TournamentStatus.CANCELLED]: 1,
            },
            14,
        );

        expect(dto.tournaments).toEqual({
            total: 13,
            draft: 2,
            active: 3,
            completed: 7,
            cancelled: 1,
        });
        expect(dto.clubs).toEqual({ total: 14 });
    });

    it('handles all-zero counts', () => {
        const dto = toMetricsDto(
            {
                [TournamentStatus.DRAFT]: 0,
                [TournamentStatus.ACTIVE]: 0,
                [TournamentStatus.COMPLETED]: 0,
                [TournamentStatus.CANCELLED]: 0,
            },
            0,
        );

        expect(dto.tournaments.total).toBe(0);
        expect(dto.clubs.total).toBe(0);
    });
});
