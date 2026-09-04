import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchemaUpdate1788524538536 implements MigrationInterface {
    name = 'SchemaUpdate1788524538536';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "training_match" DROP COLUMN "duration"`);
        await queryRunner.query(
            `CREATE TYPE "public"."training_team_member_kind_enum" AS ENUM('FIXED', 'EPHEMERAL')`,
        );
        // Nullable puis backfill (plutôt que NOT NULL direct) : sûr même sur une base portant déjà
        // des training_team_member existants, `kind` est dénormalisé depuis training_team.kind.
        await queryRunner.query(
            `ALTER TABLE "training_team_member" ADD "kind" "public"."training_team_member_kind_enum"`,
        );
        await queryRunner.query(
            `UPDATE "training_team_member" ttm SET "kind" = tt."kind"::text::"public"."training_team_member_kind_enum" FROM "training_team" tt WHERE tt."id" = ttm."team_id"`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_team_member" ALTER COLUMN "kind" SET NOT NULL`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_training_team_member_active_fixed_participant" ON "training_team_member" ("participant_id") WHERE "leftAt" IS NULL AND "kind" = 'FIXED'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP INDEX "public"."UQ_training_team_member_active_fixed_participant"`,
        );
        await queryRunner.query(`ALTER TABLE "training_team_member" DROP COLUMN "kind"`);
        await queryRunner.query(`DROP TYPE "public"."training_team_member_kind_enum"`);
        await queryRunner.query(`ALTER TABLE "training_match" ADD "duration" integer`);
    }
}
