import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { TrainingMember } from 'src/entities/training-member.entity';
import { TrainingParticipant } from 'src/entities/training-participant.entity';
import { TrainingSession } from 'src/entities/training-session.entity';
import { MatchStatus } from 'src/enum/status.enum';
import {
    TrainingParticipantStatus,
    TrainingRoundStatus,
    TrainingSessionStatus,
} from 'src/enum/training.enum';
import { TrainingRound } from 'src/entities/training-round.entity';
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

function makeService(
    participants: TrainingParticipant[],
    latestRound: TrainingRound | null = null,
) {
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

    const sessionRepo = {
        touchLastActivity: vi.fn(),
        closeSession: vi.fn(() => Promise.resolve()),
    };
    const roundRepo = {
        findLatestBySession: vi.fn(() => Promise.resolve(latestRound)),
        closeRound: vi.fn(() => Promise.resolve()),
    };
    const service = new TrainingSessionsService(
        sessionRepo as never,
        participantRepo as never,
        {
            findById: vi.fn(() => Promise.resolve(MEMBER)),
            findByTraining: vi.fn(() => Promise.resolve([MEMBER])),
        } as never,
        {} as never,
        {} as never,
        { findWithAdminAuth: vi.fn(() => Promise.resolve(session)) } as never,
        { emitSessionUpdatedFrom: vi.fn() } as never,
        roundRepo as never,
    );

    return { service, session, participantRepo, sessionRepo, roundRepo };
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

    it("refuse un invité qui porte le nom d'un membre du club, même absent de la séance", async () => {
        const { service, participantRepo } = makeService([]);

        await expect(
            service.checkin('1234', { password: 'pwd', name: '  jean DUBOIS ' }),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(participantRepo.create).not.toHaveBeenCalled();
    });

    it('refuse un invité homonyme d’un invité déjà présent', async () => {
        const guest = participant({ id: 'guest-1', name: 'Visiteur', member: null });
        const { service, participantRepo } = makeService([guest]);

        await expect(
            service.checkin('1234', { password: 'pwd', name: 'visiteur' }),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(participantRepo.create).not.toHaveBeenCalled();
    });
});

describe('TrainingSessionsService.create', () => {
    it('gives up with a 409 instead of looping when no session code is free', async () => {
        const sessionRepo = { codeExists: vi.fn(() => Promise.resolve(true)) };
        const service = new TrainingSessionsService(
            sessionRepo as never,
            {} as never,
            {} as never,
            {} as never,
            { findWithAdminAuth: vi.fn(() => Promise.resolve({ id: 't1', members: [] })) } as never,
            {} as never,
            {} as never,
            {} as never,
        );

        await expect(service.create('CLUB', { password: 'pw' } as never)).rejects.toBeInstanceOf(
            ConflictException,
        );
        expect(sessionRepo.codeExists).toHaveBeenCalledTimes(50);
    });
});

describe('TrainingSessionsService.checkin of a guest', () => {
    it('refuses a guest named like a present participant, whatever the case', async () => {
        const present = participant({ status: TrainingParticipantStatus.PRESENT });
        const { service, participantRepo } = makeService([present]);

        await expect(
            service.checkin('1234', {
                password: 'pw',
                name: ` ${present.name.toUpperCase()} `,
            } as never),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(participantRepo.save).not.toHaveBeenCalled();
    });
});

describe('TrainingSessionsService.close', () => {
    function round(statuses: { status: MatchStatus; isBye?: boolean }[]): TrainingRound {
        return {
            id: 'round-2',
            roundNumber: 2,
            status: TrainingRoundStatus.OPEN,
            matches: statuses.map((match) => ({ isBye: false, ...match })),
        } as unknown as TrainingRound;
    }

    it('closes the round in progress with the session when all its matches are validated', async () => {
        const { service, sessionRepo, roundRepo } = makeService(
            [],
            round([
                { status: MatchStatus.VALIDATED },
                // A bye needs no validation.
                { status: MatchStatus.PENDING, isBye: true },
            ]),
        );

        const closed = await service.close('1234', 'pw');

        expect(roundRepo.closeRound).toHaveBeenCalledWith('round-2');
        expect(sessionRepo.closeSession).toHaveBeenCalled();
        expect(closed.status).toBe(TrainingSessionStatus.CLOSED);
    });

    it('refuses to close the session while a match of the round is not validated', async () => {
        const { service, sessionRepo, roundRepo } = makeService(
            [],
            round([{ status: MatchStatus.VALIDATED }, { status: MatchStatus.ONGOING }]),
        );

        await expect(service.close('1234', 'pw')).rejects.toThrow(
            new BadRequestException(
                "Le round 2 n'est pas terminé : tous ses matchs doivent être validés avant de clôturer la séance.",
            ),
        );
        expect(roundRepo.closeRound).not.toHaveBeenCalled();
        expect(sessionRepo.closeSession).not.toHaveBeenCalled();
    });

    it('closes a session without any round', async () => {
        const { service, sessionRepo, roundRepo } = makeService([]);

        await service.close('1234', 'pw');

        expect(roundRepo.closeRound).not.toHaveBeenCalled();
        expect(sessionRepo.closeSession).toHaveBeenCalled();
    });

    it('leaves an already closed session untouched', async () => {
        const { service, session, sessionRepo, roundRepo } = makeService([]);
        session.status = TrainingSessionStatus.CLOSED;

        await service.close('1234', 'pw');

        expect(roundRepo.findLatestBySession).not.toHaveBeenCalled();
        expect(sessionRepo.closeSession).not.toHaveBeenCalled();
    });
});
