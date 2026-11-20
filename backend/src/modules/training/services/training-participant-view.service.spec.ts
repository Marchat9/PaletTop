import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { TrainingMemberRepository } from '../repositories/training-member.repository';
import { TrainingMatchRepository } from '../repositories/training-match.repository';
import { TrainingRoundRepository } from '../repositories/training-round.repository';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { TrainingParticipantViewService } from './training-participant-view.service';

function setup(member: { id: string } | null) {
    const session = {
        id: 's1',
        training: { id: 't1' },
        participants: [{ id: 'p1', name: 'Jean', code: '4821', member }],
    };
    const sessionRepo = { findByCodeOrThrow: vi.fn().mockResolvedValue(session) };
    const roundRepo = { findLatestBySession: vi.fn().mockResolvedValue(null) };
    return new TrainingParticipantViewService(
        sessionRepo as unknown as TrainingSessionRepository,
        roundRepo as unknown as TrainingRoundRepository,
        {} as TrainingMatchRepository,
        {
            findByTraining: vi.fn().mockResolvedValue([{ id: 'm9', name: 'Lucie', code: '5555' }]),
        } as unknown as TrainingMemberRepository,
    );
}

describe('TrainingParticipantViewService.getCurrentMatch', () => {
    it('returns the club member behind the participant', async () => {
        const result = await setup({ id: 'm1' }).getCurrentMatch('1234', '4821');

        expect(result.participant).toEqual({ id: 'p1', name: 'Jean', memberId: 'm1' });
    });

    it('returns a null member for a guest', async () => {
        const result = await setup(null).getCurrentMatch('1234', '4821');

        expect(result.participant.memberId).toBeNull();
    });
});

describe('TrainingParticipantViewService participant lookup', () => {
    it('tells a club member who is not checked in yet to see the admin', async () => {
        const error = await setup(null)
            .getCurrentMatch('1234', '5555')
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).message).toBe(
            "Vous n'êtes pas encore pointé, rapprochez vous de l'admin du club",
        );
    });

    it('keeps the invalid code error for a code nobody owns', async () => {
        await expect(setup(null).getCurrentMatch('1234', '0000')).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });
});
