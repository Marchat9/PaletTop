import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Team composition rules of a training session.
 *
 * `fallbackTeamSize` held a single fallback size, which left the arithmetic to the admin - "2 per
 * team with 3 as fallback" never fits 7 players. It becomes `allowedTeamSizes`, the set of sizes
 * the generator may use, and `allowSitOut` becomes the matching trade-off: keep the target size,
 * or let everyone play.
 */
export class TrainingSessionTeamRules1790400000000 implements MigrationInterface {
    name = 'TrainingSessionTeamRules1790400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."training_session_teamcomposition_enum" AS ENUM('RANDOM', 'LEARNING')`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_session" ADD "allowedTeamSizes" integer array NOT NULL DEFAULT '{}'`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_session" ADD "preferTargetTeamSize" boolean NOT NULL DEFAULT false`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_session" ADD "plateCount" integer NOT NULL DEFAULT 99`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_session" ADD "teamComposition" "public"."training_session_teamcomposition_enum" NOT NULL DEFAULT 'RANDOM'`,
        );

        // The existing fallback size becomes the first allowed size, together with the target size.
        await queryRunner.query(
            `UPDATE "training_session" SET "allowedTeamSizes" = ARRAY(SELECT DISTINCT unnest(ARRAY["playersPerTeam", "fallbackTeamSize"]) ORDER BY 1)`,
        );
        // "Allow sit out" already said that size wins over letting everyone play: that is exactly
        // the new trade-off.
        await queryRunner.query(
            `UPDATE "training_session" SET "preferTargetTeamSize" = "allowSitOut"`,
        );

        await queryRunner.query(`ALTER TABLE "training_session" DROP COLUMN "fallbackTeamSize"`);
        await queryRunner.query(`ALTER TABLE "training_session" DROP COLUMN "allowSitOut"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "training_session" ADD "allowSitOut" boolean NOT NULL DEFAULT false`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_session" ADD "fallbackTeamSize" integer NOT NULL DEFAULT 1`,
        );
        await queryRunner.query(
            `UPDATE "training_session" SET "allowSitOut" = "preferTargetTeamSize"`,
        );
        // Only one fallback size can be restored: the smallest one other than the target.
        await queryRunner.query(
            `UPDATE "training_session" SET "fallbackTeamSize" = COALESCE((SELECT MIN(size) FROM unnest("allowedTeamSizes") AS size WHERE size <> "playersPerTeam"), "playersPerTeam")`,
        );

        await queryRunner.query(`ALTER TABLE "training_session" DROP COLUMN "teamComposition"`);
        await queryRunner.query(`ALTER TABLE "training_session" DROP COLUMN "plateCount"`);
        await queryRunner.query(
            `ALTER TABLE "training_session" DROP COLUMN "preferTargetTeamSize"`,
        );
        await queryRunner.query(`ALTER TABLE "training_session" DROP COLUMN "allowedTeamSizes"`);
        await queryRunner.query(`DROP TYPE "public"."training_session_teamcomposition_enum"`);
    }
}
