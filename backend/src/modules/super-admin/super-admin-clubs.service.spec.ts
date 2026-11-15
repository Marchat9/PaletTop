import { describe, expect, it, vi, type Mock } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PlayerClub } from 'src/entities/player_club.entity';
import { PlayerClubRepository } from 'src/modules/tournaments/repositories/player-club.repository';
import { SuperAdminClubMergeDto } from './dto/super-admin-club-merge.dto';
import { SuperAdminClubsService } from './super-admin-clubs.service';

// The rollback itself is done by the database; here @Transactional() just runs the method.
vi.mock('typeorm-transactional', () => ({
    Transactional: () => () => undefined,
}));

const TARGET_ID = '11111111-1111-4111-8111-111111111111';
const SOURCE_ID = '22222222-2222-4222-8222-222222222222';

interface ClubRepoMock {
    findByIds: Mock<(ids: string[]) => Promise<PlayerClub[]>>;
    findByNormalizedName: Mock<
        (name: string, excludeIds?: string | string[]) => Promise<PlayerClub | null>
    >;
    movePlayers: Mock<(sourceClubId: string, targetClubId: string) => Promise<number>>;
    deleteMany: Mock<(ids: string[]) => Promise<void>>;
    rename: Mock<(id: string, name: string) => Promise<void>>;
}

function club(id: string, name: string): PlayerClub {
    return { id, name } as PlayerClub;
}

function setup(
    clubs: PlayerClub[] = [club(TARGET_ID, 'Palet Club'), club(SOURCE_ID, 'PaletClub')],
): { service: SuperAdminClubsService; clubRepo: ClubRepoMock; calls: string[] } {
    const calls: string[] = [];
    const clubRepo: ClubRepoMock = {
        findByIds: vi.fn(async (ids: string[]) => clubs.filter((c) => ids.includes(c.id))),
        findByNormalizedName: vi.fn(async () => null),
        movePlayers: vi.fn(async () => {
            calls.push('movePlayers');
            return 3;
        }),
        deleteMany: vi.fn(async () => {
            calls.push('deleteMany');
        }),
        rename: vi.fn(async () => {
            calls.push('rename');
        }),
    };
    const service = new SuperAdminClubsService(clubRepo as unknown as PlayerClubRepository);
    return { service, clubRepo, calls };
}

function dto(sourceClubId: string, newName?: string): SuperAdminClubMergeDto {
    return { password: 'secret', sourceClubId, newName };
}

function expectNoWrite(clubRepo: ClubRepoMock): void {
    expect(clubRepo.movePlayers).not.toHaveBeenCalled();
    expect(clubRepo.deleteMany).not.toHaveBeenCalled();
    expect(clubRepo.rename).not.toHaveBeenCalled();
}

describe('SuperAdminClubsService.mergeClubs', () => {
    it('rejects the same id without touching the repo', async () => {
        const { service, clubRepo } = setup();

        await expect(service.mergeClubs(TARGET_ID, dto(TARGET_ID))).rejects.toThrow(
            new BadRequestException('Impossible de fusionner un club avec lui-même.'),
        );
        expect(clubRepo.findByIds).not.toHaveBeenCalled();
        expect(clubRepo.findByNormalizedName).not.toHaveBeenCalled();
        expectNoWrite(clubRepo);
    });

    it('rejects an unknown source', async () => {
        const { service, clubRepo } = setup([club(TARGET_ID, 'Palet Club')]);

        await expect(service.mergeClubs(TARGET_ID, dto(SOURCE_ID))).rejects.toThrow(
            new NotFoundException('Club introuvable.'),
        );
        expectNoWrite(clubRepo);
    });

    it('rejects an unknown target', async () => {
        const { service, clubRepo } = setup([club(SOURCE_ID, 'PaletClub')]);

        await expect(service.mergeClubs(TARGET_ID, dto(SOURCE_ID))).rejects.toThrow(
            new NotFoundException('Club introuvable.'),
        );
        expectNoWrite(clubRepo);
    });

    it('moves players and deletes the source without renaming when no newName', async () => {
        const { service, clubRepo } = setup();

        await service.mergeClubs(TARGET_ID, dto(SOURCE_ID));

        expect(clubRepo.findByIds).toHaveBeenCalledWith([TARGET_ID, SOURCE_ID]);
        expect(clubRepo.movePlayers).toHaveBeenCalledWith(SOURCE_ID, TARGET_ID);
        expect(clubRepo.deleteMany).toHaveBeenCalledWith([SOURCE_ID]);
        expect(clubRepo.findByNormalizedName).not.toHaveBeenCalled();
        expect(clubRepo.rename).not.toHaveBeenCalled();
    });

    it('checks the new name ignoring both clubs', async () => {
        const { service, clubRepo } = setup();

        await service.mergeClubs(TARGET_ID, dto(SOURCE_ID, 'Palet Club Rennes'));

        expect(clubRepo.findByNormalizedName).toHaveBeenCalledWith('Palet Club Rennes', [
            TARGET_ID,
            SOURCE_ID,
        ]);
        expect(clubRepo.rename).toHaveBeenCalledWith(TARGET_ID, 'Palet Club Rennes');
    });

    it('rejects a name used by another club without any write', async () => {
        const { service, clubRepo } = setup();
        clubRepo.findByNormalizedName.mockResolvedValue(club('other', 'Autre Club'));

        await expect(service.mergeClubs(TARGET_ID, dto(SOURCE_ID, 'Autre Club'))).rejects.toThrow(
            new ConflictException('Un club avec ce nom existe déjà.'),
        );
        expectNoWrite(clubRepo);
    });

    it('allows the source name as the new name', async () => {
        const { service, clubRepo } = setup();

        await service.mergeClubs(TARGET_ID, dto(SOURCE_ID, 'PaletClub'));

        expect(clubRepo.rename).toHaveBeenCalledWith(TARGET_ID, 'PaletClub');
    });

    it('runs movePlayers, then deleteMany, then rename', async () => {
        const { service, calls } = setup();

        await service.mergeClubs(TARGET_ID, dto(SOURCE_ID, 'Palet Club'));

        expect(calls).toEqual(['movePlayers', 'deleteMany', 'rename']);
    });

    it('propagates a repository failure', async () => {
        const { service, clubRepo } = setup();
        const failure = new Error('db down');
        clubRepo.deleteMany.mockRejectedValue(failure);

        await expect(service.mergeClubs(TARGET_ID, dto(SOURCE_ID, 'Palet Club'))).rejects.toBe(
            failure,
        );
        expect(clubRepo.rename).not.toHaveBeenCalled();
    });
});
