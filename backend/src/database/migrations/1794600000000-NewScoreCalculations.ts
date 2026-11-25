import { MigrationInterface, QueryRunner } from 'typeorm';

const ENUM_NAME = '"public"."tournament_scorecalculation_enum"';
const NEW_VALUES = `'victory_goal_average', 'victory_best_defeats', 'victory_points_scored', 'tournament_score'`;
const PREVIOUS_VALUES = `'victory_ga', 'score', 'tournament_score', 'victory_buchholz_ga', 'score_buchholz_ga'`;

const NEW_STANDARD_AND_UP_DOWN =
    '["victory_goal_average", "victory_best_defeats", "victory_points_scored"]';
const PREVIOUS_STANDARD = '["victory_ga", "score"]';
const PREVIOUS_UP_DOWN = '["victory_buchholz_ga", "score_buchholz_ga"]';
const CHAMPIONSHIP = '["tournament_score"]';

/**
 * Replaces the score calculations by the three victory-based ones (goal-average, best defeats,
 * points scored) and the championship points; the Buchholz calculations are gone. Postgres cannot
 * drop enum values, so the type is recreated. Existing tournaments are mapped to the closest new
 * calculation, and the per-mode list of the super-admin setting is reset to the new defaults
 * (the removed values it may hold would no longer be valid).
 */
export class NewScoreCalculations1794600000000 implements MigrationInterface {
    name = 'NewScoreCalculations1794600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TYPE ${ENUM_NAME} RENAME TO "tournament_scorecalculation_enum_old"`,
        );
        await queryRunner.query(`CREATE TYPE ${ENUM_NAME} AS ENUM(${NEW_VALUES})`);
        await queryRunner.query(
            `ALTER TABLE "tournament" ALTER COLUMN "scoreCalculation" TYPE ${ENUM_NAME}
             USING (CASE "scoreCalculation"::text
                 WHEN 'victory_ga' THEN 'victory_goal_average'
                 WHEN 'victory_buchholz_ga' THEN 'victory_goal_average'
                 WHEN 'score' THEN 'victory_points_scored'
                 WHEN 'score_buchholz_ga' THEN 'victory_points_scored'
                 ELSE "scoreCalculation"::text
             END)::${ENUM_NAME}`,
        );
        await queryRunner.query(`DROP TYPE "public"."tournament_scorecalculation_enum_old"`);
        await queryRunner.query(
            `UPDATE "app_setting"
             SET "value" = jsonb_build_object(
                     'standard', $1::jsonb, 'up_down', $1::jsonb, 'championship', $2::jsonb),
                 "source" = 'migration',
                 "sourceDetail" = $3,
                 "appVersion" = $4,
                 "updatedAt" = now()
             WHERE "key" = 'score_calculations_by_mode'`,
            [NEW_STANDARD_AND_UP_DOWN, CHAMPIONSHIP, this.name, process.env.APP_VERSION || null],
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `UPDATE "app_setting"
             SET "value" = jsonb_build_object(
                     'standard', $1::jsonb, 'up_down', $2::jsonb, 'championship', $3::jsonb)
             WHERE "key" = 'score_calculations_by_mode' AND "sourceDetail" = $4`,
            [PREVIOUS_STANDARD, PREVIOUS_UP_DOWN, CHAMPIONSHIP, this.name],
        );
        await queryRunner.query(
            `ALTER TYPE ${ENUM_NAME} RENAME TO "tournament_scorecalculation_enum_new"`,
        );
        await queryRunner.query(`CREATE TYPE ${ENUM_NAME} AS ENUM(${PREVIOUS_VALUES})`);
        await queryRunner.query(
            `ALTER TABLE "tournament" ALTER COLUMN "scoreCalculation" TYPE ${ENUM_NAME}
             USING (CASE "scoreCalculation"::text
                 WHEN 'victory_goal_average' THEN 'victory_ga'
                 WHEN 'victory_best_defeats' THEN 'victory_ga'
                 WHEN 'victory_points_scored' THEN 'score'
                 ELSE "scoreCalculation"::text
             END)::${ENUM_NAME}`,
        );
        await queryRunner.query(`DROP TYPE "public"."tournament_scorecalculation_enum_new"`);
    }
}
