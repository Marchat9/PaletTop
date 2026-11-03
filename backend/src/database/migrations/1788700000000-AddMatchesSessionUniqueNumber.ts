import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchesSessionUniqueNumber1788700000000 implements MigrationInterface {
    name = 'AddMatchesSessionUniqueNumber1788700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "matches_session" ADD CONSTRAINT "UQ_matches_session_tournament_number" UNIQUE ("tournament_id", "sessionNumber")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "matches_session" DROP CONSTRAINT "UQ_matches_session_tournament_number"`,
        );
    }
}
