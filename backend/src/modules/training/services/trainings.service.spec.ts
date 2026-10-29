import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { Training } from 'src/entities/training.entity';
import { TrainingMember } from 'src/entities/training-member.entity';
import { TrainingSession } from 'src/entities/training-session.entity';
import { TrainingsService } from './trainings.service';

const PASSWORD = 'secret';
const CREATED_AT = new Date('2026-01-01T18:00:00Z');

function makeService(openSessionCodes: string[] = []) {
    const training = {
        id: 'training-1',
        code: 'CLUB-1',
        createdAt: CREATED_AT,
        members: [
            { id: 'member-1', name: 'Thomas', createdAt: CREATED_AT },
            { id: 'member-2', name: 'Thomas Durand', createdAt: CREATED_AT },
        ],
    } as Training;

    const participantUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn(),
    };
    const manager = {
        update: vi.fn(),
        createQueryBuilder: vi.fn(() => ({ update: vi.fn(() => participantUpdate) })),
    };
    const dataSource = {
        transaction: vi.fn((work: (m: typeof manager) => Promise<void>) => work(manager)),
    };

    const sessionRepo = {
        findOpenCodesWithMember: vi.fn(() => Promise.resolve(openSessionCodes)),
        findByCodeOrThrow: vi.fn((code: string) =>
            Promise.resolve({ id: `id-${code}`, code } as TrainingSession),
        ),
    };
    const memberRepo = {
        create: vi.fn((data: Partial<TrainingMember>) => ({
            id: 'member-new',
            createdAt: CREATED_AT,
            ...data,
        })),
        save: vi.fn((member: TrainingMember) => Promise.resolve(member)),
    };
    const leaderboardService = { getLeaderboardBySessionId: vi.fn(() => Promise.resolve([])) };
    const gateway = { emitSessionUpdatedFrom: vi.fn(), emitLeaderboardUpdated: vi.fn() };

    const service = new TrainingsService(
        {} as never,
        memberRepo as never,
        sessionRepo as never,
        { findWithAdminAuth: vi.fn(() => Promise.resolve(training)) } as never,
        leaderboardService as never,
        gateway as never,
        dataSource as never,
    );

    return { service, manager, participantUpdate, sessionRepo, memberRepo, gateway };
}

describe('TrainingsService.renameMember', () => {
    it('renomme le membre et toutes ses participations, séances passées comprises', async () => {
        const { service, manager, participantUpdate } = makeService();

        const result = await service.renameMember('CLUB-1', 'member-1', {
            password: PASSWORD,
            name: 'Thomas Martin',
        });

        expect(manager.update).toHaveBeenCalledWith(TrainingMember, 'member-1', {
            name: 'Thomas Martin',
        });
        expect(participantUpdate.set).toHaveBeenCalledWith({ name: 'Thomas Martin' });
        expect(participantUpdate.where).toHaveBeenCalledWith('member_id = :memberId', {
            memberId: 'member-1',
        });
        expect(result.members.find((m) => m.id === 'member-1')?.name).toBe('Thomas Martin');
    });

    it('prévient les séances encore ouvertes, avec la séance et le classement', async () => {
        const { service, gateway } = makeService(['7599']);

        await service.renameMember('CLUB-1', 'member-1', {
            password: PASSWORD,
            name: 'Thomas Martin',
        });

        expect(gateway.emitSessionUpdatedFrom).toHaveBeenCalledWith(
            expect.objectContaining({ code: '7599' }),
        );
        expect(gateway.emitLeaderboardUpdated).toHaveBeenCalledWith('7599', []);
    });

    // Telling two players apart is the whole point: a rename must not create a new homonym.
    it('refuse un nom déjà porté dans le club, sans tenir compte de la casse', async () => {
        const { service, manager } = makeService();

        await expect(
            service.renameMember('CLUB-1', 'member-1', {
                password: PASSWORD,
                name: 'thomas durand',
            }),
        ).rejects.toThrow(ConflictException);
        expect(manager.update).not.toHaveBeenCalled();
    });

    it('accepte de changer seulement la casse de son propre nom', async () => {
        const { service, manager } = makeService();

        await service.renameMember('CLUB-1', 'member-1', { password: PASSWORD, name: 'THOMAS' });

        expect(manager.update).toHaveBeenCalledWith(TrainingMember, 'member-1', {
            name: 'THOMAS',
        });
    });

    it('refuse un membre qui n’est pas dans le club', async () => {
        const { service } = makeService();

        await expect(
            service.renameMember('CLUB-1', 'member-unknown', { password: PASSWORD, name: 'Léa' }),
        ).rejects.toThrow(NotFoundException);
    });

    // The rename is committed before the broadcast: the admin must not see an error for it.
    it('réussit même si la diffusion aux séances ouvertes échoue', async () => {
        const { service, sessionRepo } = makeService();
        sessionRepo.findOpenCodesWithMember.mockRejectedValueOnce(new Error('db down'));
        const logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

        await expect(
            service.renameMember('CLUB-1', 'member-1', {
                password: PASSWORD,
                name: 'Thomas Martin',
            }),
        ).resolves.toBeDefined();
        expect(logError).toHaveBeenCalled();
        logError.mockRestore();
    });
});

describe('TrainingsService.addMember', () => {
    it('refuse un homonyme dans le club', async () => {
        const { service, memberRepo } = makeService();

        await expect(
            service.addMember('CLUB-1', { password: PASSWORD, name: '  thomas ' }),
        ).rejects.toThrow(ConflictException);
        expect(memberRepo.save).not.toHaveBeenCalled();
    });

    it('ajoute un membre au nom inédit', async () => {
        const { service } = makeService();

        const result = await service.addMember('CLUB-1', { password: PASSWORD, name: 'Léa' });

        expect(result.members.map((m) => m.name)).toContain('Léa');
    });
});
