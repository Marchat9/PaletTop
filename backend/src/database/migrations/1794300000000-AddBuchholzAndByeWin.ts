import { MigrationInterface, QueryRunner } from 'typeorm';

const UP_DOWN_BUCHHOLZ = '["victory_buchholz_ga", "score_buchholz_ga"]';
const UP_DOWN_PREVIOUS = '["victory_ga", "score"]';

/**
 * Buchholz score calculations, neutral-GA byes, and the up-down mode offering the Buchholz
 * calculations by default — unless the super-admin or an env var already chose its list.
 */
export class AddBuchholzAndByeWin1794300000000 implements MigrationInterface {
    name = 'AddBuchholzAndByeWin1794300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TYPE "public"."tournament_scorecalculation_enum" ADD VALUE IF NOT EXISTS 'victory_buchholz_ga'`,
        );
        await queryRunner.query(
            `ALTER TYPE "public"."tournament_scorecalculation_enum" ADD VALUE IF NOT EXISTS 'score_buchholz_ga'`,
        );
        // Legacy byes keep `false`: they were stored pointsPerGame-0 and keep counting as before.
        await queryRunner.query(
            `ALTER TABLE "tournament_match" ADD "byeWin" boolean NOT NULL DEFAULT false`,
        );
        await queryRunner.query(
            `UPDATE "app_setting"
             SET "value" = jsonb_set("value", '{up_down}', $1::jsonb),
                 "source" = 'migration',
                 "sourceDetail" = $2,
                 "appVersion" = $3,
                 "updatedAt" = now()
             WHERE "key" = 'score_calculations_by_mode'
               AND "source" IN ('app_default', 'migration')`,
            [UP_DOWN_BUCHHOLZ, this.name, process.env.APP_VERSION || null],
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `UPDATE "app_setting"
             SET "value" = jsonb_set("value", '{up_down}', $1::jsonb)
             WHERE "key" = 'score_calculations_by_mode' AND "sourceDetail" = $2`,
            [UP_DOWN_PREVIOUS, this.name],
        );
        await queryRunner.query(`ALTER TABLE "tournament_match" DROP COLUMN "byeWin"`);
        // Postgres can't drop an enum value: the two Buchholz values stay in the type, unused.
    }
}
