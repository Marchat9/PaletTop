import { describe, expect, it, vi } from 'vitest';
import { Repository } from 'typeorm';
import { Player } from 'src/entities/player.entity';
import { PlayerClub } from 'src/entities/player_club.entity';
import { escapeLikePattern, PlayerClubRepository } from './player-club.repository';

describe('escapeLikePattern', () => {
    it('escapes LIKE wildcards in the search', () => {
        expect(escapeLikePattern('50%_a\\b')).toBe('50\\%\\_a\\\\b');
    });
});

function setupRepository() {
    const queryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getOne: vi.fn(async () => null),
    };
    const managerQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn(async () => ({ affected: 4 })),
    };
    const typeormRepo = {
        createQueryBuilder: vi.fn(() => queryBuilder),
        findBy: vi.fn(async () => [] as PlayerClub[]),
        manager: { createQueryBuilder: vi.fn(() => managerQueryBuilder) },
    };
    const repository = new PlayerClubRepository(typeormRepo as unknown as Repository<PlayerClub>);
    return { repository, typeormRepo, queryBuilder, managerQueryBuilder };
}

describe('PlayerClubRepository.findByNormalizedName', () => {
    it('does not exclude anything without excludeIds', async () => {
        const { repository, queryBuilder } = setupRepository();

        await repository.findByNormalizedName(' Palet  Club ');

        expect(queryBuilder.where).toHaveBeenCalledWith(expect.any(String), {
            normalizedName: 'paletclub',
        });
        expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('excludes a single id', async () => {
        const { repository, queryBuilder } = setupRepository();

        await repository.findByNormalizedName('Palet Club', 'id-1');

        expect(queryBuilder.andWhere).toHaveBeenCalledWith('club.id NOT IN (:...excludeIds)', {
            excludeIds: ['id-1'],
        });
    });

    it('excludes several ids', async () => {
        const { repository, queryBuilder } = setupRepository();

        await repository.findByNormalizedName('Palet Club', ['id-1', 'id-2']);

        expect(queryBuilder.andWhere).toHaveBeenCalledWith('club.id NOT IN (:...excludeIds)', {
            excludeIds: ['id-1', 'id-2'],
        });
    });

    it('ignores an empty excludeIds list', async () => {
        const { repository, queryBuilder } = setupRepository();

        await repository.findByNormalizedName('Palet Club', []);

        expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });
});

describe('PlayerClubRepository.findByIds', () => {
    it('returns an empty list without querying for no ids', async () => {
        const { repository, typeormRepo } = setupRepository();

        await expect(repository.findByIds([])).resolves.toEqual([]);
        expect(typeormRepo.findBy).not.toHaveBeenCalled();
    });

    it('loads the clubs by id', async () => {
        const { repository, typeormRepo } = setupRepository();
        const clubs = [{ id: 'id-1', name: 'A' }] as PlayerClub[];
        typeormRepo.findBy.mockResolvedValue(clubs);

        await expect(repository.findByIds(['id-1', 'id-2'])).resolves.toBe(clubs);
        expect(typeormRepo.findBy).toHaveBeenCalledWith({ id: expect.anything() });
    });
});

describe('PlayerClubRepository.movePlayers', () => {
    it('moves the players of the source club to the target club and returns the count', async () => {
        const { repository, managerQueryBuilder } = setupRepository();

        await expect(repository.movePlayers('source', 'target')).resolves.toBe(4);

        expect(managerQueryBuilder.update).toHaveBeenCalledWith(Player);
        expect(managerQueryBuilder.set).toHaveBeenCalledWith({ club: { id: 'target' } });
        expect(managerQueryBuilder.where).toHaveBeenCalledWith('player_club_id = :sourceClubId', {
            sourceClubId: 'source',
        });
    });

    it('returns 0 when the driver does not report the affected rows', async () => {
        const { repository, managerQueryBuilder } = setupRepository();
        managerQueryBuilder.execute.mockResolvedValue({ affected: undefined } as never);

        await expect(repository.movePlayers('source', 'target')).resolves.toBe(0);
    });
});
