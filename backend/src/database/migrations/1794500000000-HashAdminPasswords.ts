import { Logger } from '@nestjs/common';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { resolvePasswordPepper } from '../../config/password.config';
import { hashPassword, isArgon2idHash } from '../../utils/password-hash.util';

const TABLES = ['tournament', 'training'] as const;

interface AdminPasswordRow {
    id: string;
    adminPassword: string;
}

/**
 * Replaces the clear tournament/training admin passwords with peppered Argon2id hashes.
 *
 * The pepper rules are imported from the app on purpose (not copied): the hashes written here are
 * verified by the app, so both must always resolve the same pepper. Rows already hashed are left
 * untouched, so running it twice is harmless. Irreversible: clear passwords cannot be restored.
 */
export class HashAdminPasswords1794500000000 implements MigrationInterface {
    name = 'HashAdminPasswords1794500000000';
    private readonly logger = new Logger(HashAdminPasswords1794500000000.name);

    public async up(queryRunner: QueryRunner): Promise<void> {
        const pepper = resolvePasswordPepper();

        for (const table of TABLES) {
            const rows: AdminPasswordRow[] = await queryRunner.query(
                `SELECT "id", "adminPassword" FROM "${table}"`,
            );
            const clearRows = rows.filter((row) => !isArgon2idHash(row.adminPassword));
            for (const row of clearRows) {
                await queryRunner.query(
                    `UPDATE "${table}" SET "adminPassword" = $1 WHERE "id" = $2`,
                    [await hashPassword(row.adminPassword, pepper), row.id],
                );
            }
            this.logger.log(`Hashed ${clearRows.length} ${table} admin password(s)`);
        }
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        this.logger.warn('Admin passwords stay hashed: clear passwords cannot be restored.');
    }
}
