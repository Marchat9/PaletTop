import { describe, expect, it, vi } from 'vitest';
import { TrainingMatchRepository } from '../repositories/training-match.repository';
import { TrainingRoundRepository } from '../repositories/training-round.repository';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { TrainingParticipantViewService } from './training-participant-view.service';

function setup(member: { id: string } | null) {
    const session = {
        id: 's1',
        participants: [{ id: 'p1', name: 'Jean', code: '4821', member }],
    };
    const sessionRepo = { findByCodeOrThrow: vi.fn().mockResolvedValue(session) };
    const roundRepo = { findLatestBySession: vi.fn().mockResolvedValue(null) };
    return new TrainingParticipantViewService(
        sessionRepo as unknown as TrainingSessionRepository,
        roundRepo as unknown as TrainingRoundRepository,
        {} as TrainingMatchRepository,
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
