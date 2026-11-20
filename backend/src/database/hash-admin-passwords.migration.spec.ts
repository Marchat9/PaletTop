import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { hashPassword, verifyPassword } from 'src/utils/password-hash.util';
import { HashAdminPasswords1794500000000 } from './migrations/1794500000000-HashAdminPasswords';

const PEPPER = 'p'.repeat(32);

interface Row {
    id: string;
    adminPassword: string;
}

function makeQueryRunner(rows: { tournament: Row[]; training: Row[] }) {
    const query = vi.fn((sql: string): Promise<Row[] | void> => {
        if (sql.startsWith('SELECT')) {
            return Promise.resolve(sql.includes('"tournament"') ? rows.tournament : rows.training);
        }
        return Promise.resolve();
    });
    return { queryRunner: { query } as unknown as QueryRunner, query };
}

function updatesOn(query: ReturnType<typeof vi.fn>, table: string): unknown[][] {
    return query.mock.calls.filter(([sql]) => String(sql).startsWith(`UPDATE "${table}"`));
}

describe('HashAdminPasswords1794500000000', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env.PASSWORD_PEPPER = PEPPER;
        vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
        vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        vi.restoreAllMocks();
    });

    it('hashes every clear password with the pepper', async () => {
        const { queryRunner, query } = makeQueryRunner({
            tournament: [
                { id: 't1', adminPassword: 'tournoi-1' },
                { id: 't2', adminPassword: 'tournoi-2' },
            ],
            training: [{ id: 'e1', adminPassword: 'entrainement' }],
        });

        await new HashAdminPasswords1794500000000().up(queryRunner);

        const tournamentUpdates = updatesOn(query, 'tournament');
        expect(tournamentUpdates).toHaveLength(2);
        expect(tournamentUpdates[0][0]).toBe(
            'UPDATE "tournament" SET "adminPassword" = $1 WHERE "id" = $2',
        );
        const [[hash1, id1], [hash2, id2]] = tournamentUpdates.map(
            ([, params]) => params as string[],
        );
        expect([id1, id2]).toEqual(['t1', 't2']);
        await expect(verifyPassword(hash1, 'tournoi-1', PEPPER)).resolves.toBe(true);
        await expect(verifyPassword(hash2, 'tournoi-2', PEPPER)).resolves.toBe(true);

        const trainingUpdates = updatesOn(query, 'training');
        expect(trainingUpdates).toHaveLength(1);
        const [trainingHash, trainingId] = trainingUpdates[0][1] as string[];
        expect(trainingId).toBe('e1');
        await expect(verifyPassword(trainingHash, 'entrainement', PEPPER)).resolves.toBe(true);
    });

    it('skips rows already hashed', async () => {
        const alreadyHashed = await hashPassword('deja', PEPPER);
        const { queryRunner, query } = makeQueryRunner({
            tournament: [{ id: 't1', adminPassword: alreadyHashed }],
            training: [{ id: 'e1', adminPassword: alreadyHashed }],
        });

        await new HashAdminPasswords1794500000000().up(queryRunner);

        expect(updatesOn(query, 'tournament')).toHaveLength(0);
        expect(updatesOn(query, 'training')).toHaveLength(0);
    });

    it('down is a no-op: clear passwords cannot be restored', async () => {
        const { queryRunner, query } = makeQueryRunner({ tournament: [], training: [] });

        await new HashAdminPasswords1794500000000().down(queryRunner);

        expect(query).not.toHaveBeenCalled();
    });
});
