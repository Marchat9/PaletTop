import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { MatchStatus, MatchesSessionStatus } from 'src/enum/status.enum';
import { ScoreService } from './score.service';

describe('ScoreService.validateMatch against a stale score', () => {
    it('refuses to validate a score the player never saw', async () => {
        const matchRepo = {
            findByIdInTournament: vi.fn(async () => ({
                id: 'm1',
                status: MatchStatus.ENDED,
                scoreA: 13,
                scoreB: 9,
                teamA: { code: 'AAAA' },
                teamB: { code: 'BBBB' },
                session: { status: MatchesSessionStatus.OPEN },
            })),
            updateIfStatus: vi.fn(async () => true),
        };
        const service = new ScoreService(
            { findByCode: vi.fn(async () => ({ id: 'T1' })) } as never,
            matchRepo as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
        );

        await expect(
            service.validateMatch('CODE', 'm1', 'AAAA', 'BBBB', { scoreA: 12, scoreB: 9 }),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(matchRepo.updateIfStatus).not.toHaveBeenCalled();
    });
});

describe('ScoreService.validateMatch racing a score change', () => {
    function setupRace(latestStatus: MatchStatus) {
        const read = {
            id: 'm1',
            status: MatchStatus.ENDED,
            scoreA: 13,
            scoreB: 9,
            teamA: { code: 'AAAA' },
            teamB: { code: 'BBBB' },
            session: { status: MatchesSessionStatus.OPEN },
        };
        const matchRepo = {
            findByIdInTournament: vi.fn(async () => read),
            updateIfStatus: vi.fn(async () => false),
            findByIdWithSession: vi.fn(async () => ({ ...read, scoreB: 10, status: latestStatus })),
        };
        return new ScoreService(
            { findByCode: vi.fn(async () => ({ id: 'T1' })) } as never,
            matchRepo as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
        );
    }

    it('refuses as stale a score changed between the read and the write', async () => {
        await expect(
            setupRace(MatchStatus.ENDED).validateMatch('CODE', 'm1', 'AAAA', 'BBBB', {
                scoreA: 13,
                scoreB: 9,
            }),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('keeps the already validated message when the other team validated first', async () => {
        await expect(
            setupRace(MatchStatus.VALIDATED).validateMatch('CODE', 'm1', 'AAAA', 'BBBB', {
                scoreA: 13,
                scoreB: 9,
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});
