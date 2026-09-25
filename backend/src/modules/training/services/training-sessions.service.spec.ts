import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { TrainingMember } from 'src/entities/training-member.entity';
import { TrainingParticipant } from 'src/entities/training-participant.entity';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingParticipantStatus, TrainingSessionStatus } from 'src/enum/training.enum';
import { TrainingSessionsService } from './training-sessions.service';

const MEMBER = {
    id: 'member-1',
    name: 'Jean Dubois',
    training: { id: 'training-1' },
} as TrainingMember;

function participant(overrides: Partial<TrainingParticipant>): TrainingParticipant {
    return {
        id: 'p1',
        name: 'Jean Dubois',
        code: '4821',
        status: TrainingParticipantStatus.PRESENT,
        member: MEMBER,
        createdAt: new Date('2026-01-01T18:00:00Z'),
        ...overrides,
    } as TrainingParticipant;
}

function makeService(participants: TrainingParticipant[]) {
    const session = {
        id: 'session-1',
        code: '1234',
        status: TrainingSessionStatus.OPEN,
        training: { id: 'training-1', code: 'CLUB-1' },
        participants,
        teams: [],
        date: new Date('2026-01-01T00:00:00Z'),
        createdAt: new Date('2026-01-01T00:00:00Z'),
    } as unknown as TrainingSession;

    const participantRepo = {
        create: vi.fn((data: Partial<TrainingParticipant>) => ({ id: 'new-id', ...data })),
        save: vi.fn((p: TrainingParticipant) => Promise.resolve(p)),
    };

    const service = new TrainingSessionsService(
        { touchLastActivity: vi.fn() } as never,
        participantRepo as never,
        { findById: vi.fn(() => Promise.resolve(MEMBER)) } as never,
        {} as never,
        {} as never,
        { findWithAdminAuth: vi.fn(() => Promise.resolve(session)) } as never,
        { emitSessionUpdatedFrom: vi.fn() } as never,
    );

    return { service, session, participantRepo };
}

describe('TrainingSessionsService.checkin', () => {
    it('rend sa propre ligne au membre qui revient, code compris', async () => {
        const left = participant({ status: TrainingParticipantStatus.LEFT });
        const { service, participantRepo } = makeService([left]);

        const result = await service.checkin('1234', { password: 'pwd', memberId: MEMBER.id });

        // A new row would detach the results already played: leaderboard and history hang on the
        // participant id.
        expect(participantRepo.create).not.toHaveBeenCalled();
        expect(result.participants).toHaveLength(1);
        expect(result.participants[0]).toMatchObject({
            id: 'p1',
            code: '4821',
            status: TrainingParticipantStatus.PRESENT,
        });
    });

    it('reprend la première ligne quand un membre est déjà parti plusieurs fois', async () => {
        const older = participant({
            id: 'p-old',
            code: '1111',
            status: TrainingParticipantStatus.LEFT,
            createdAt: new Date('2026-01-01T18:00:00Z'),
        });
        const newer = participant({
            id: 'p-new',
            code: '2222',
            status: TrainingParticipantStatus.LEFT,
            createdAt: new Date('2026-01-01T19:00:00Z'),
        });
        const { service } = makeService([newer, older]);

        const result = await service.checkin('1234', { password: 'pwd', memberId: MEMBER.id });

        const present = result.participants.filter(
            (p) => p.status === TrainingParticipantStatus.PRESENT,
        );
        expect(present).toHaveLength(1);
        expect(present[0].id).toBe('p-old');
    });

    it('refuse un membre déjà présent', async () => {
        const { service } = makeService([participant({})]);

        await expect(
            service.checkin('1234', { password: 'pwd', memberId: MEMBER.id }),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it("crée une ligne par venue pour un invité, qui n'a pas d'identité hors de la séance", async () => {
        const guestGone = participant({
            id: 'guest-1',
            name: 'Visiteur',
            member: null,
            status: TrainingParticipantStatus.LEFT,
        });
        const { service, participantRepo } = makeService([guestGone]);

        const result = await service.checkin('1234', { password: 'pwd', name: 'Visiteur' });

        expect(participantRepo.create).toHaveBeenCalled();
        expect(result.participants).toHaveLength(2);
    });
});
