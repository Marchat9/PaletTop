import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creation / update dates were stored without time zone: read back in the server's zone, they
 * showed one hour off in France. Existing values were written by now() in the database session
 * zone, so they are read in that zone to keep the same instant.
 */
const COLUMNS: ReadonlyArray<[table: string, column: string]> = [
    ['tournament_match', 'createdAt'],
    ['tournament_match', 'updatedAt'],
    ['tournament', 'createdAt'],
    ['training_member', 'createdAt'],
    ['training_participant', 'createdAt'],
    ['training_match', 'createdAt'],
    ['training_match', 'updatedAt'],
    ['training_round', 'createdAt'],
    ['training_team', 'createdAt'],
    ['training_session', 'createdAt'],
    ['training', 'createdAt'],
];

export class DatesWithTimeZone1794000000000 implements MigrationInterface {
    name = 'DatesWithTimeZone1794000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const [table, column] of COLUMNS) {
            await queryRunner.query(
                `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE TIMESTAMP WITH TIME ZONE USING "${column}" AT TIME ZONE current_setting('TimeZone')`,
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const [table, column] of COLUMNS) {
            await queryRunner.query(
                `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE TIMESTAMP WITHOUT TIME ZONE USING "${column}" AT TIME ZONE current_setting('TimeZone')`,
            );
        }
    }
}
