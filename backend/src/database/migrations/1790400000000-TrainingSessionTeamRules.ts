import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Règles de composition des équipes d'une séance d'entraînement.
 *
 * `fallbackTeamSize` ne portait qu'une seule taille de repli, ce qui obligeait l'administrateur
 * à faire l'arithmétique lui-même — « 2 par équipe avec 3 en repli » ne tombe jamais juste à 7
 * joueurs. Il devient `allowedTeamSizes`, l'ensemble des tailles que le générateur a le droit
 * d'utiliser, et `allowSitOut` devient l'arbitrage correspondant : garder la taille visée, ou
 * faire jouer tout le monde.
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

        // La taille de repli existante devient la première taille autorisée, avec la taille visée.
        await queryRunner.query(
            `UPDATE "training_session" SET "allowedTeamSizes" = ARRAY(SELECT DISTINCT unnest(ARRAY["playersPerTeam", "fallbackTeamSize"]) ORDER BY 1)`,
        );
        // « Autoriser le repos » disait déjà que la taille primait sur le fait de faire jouer tout
        // le monde : c'est exactement le nouvel arbitrage.
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
        // On ne peut restituer qu'une seule taille de repli : la plus petite autre que la visée.
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
