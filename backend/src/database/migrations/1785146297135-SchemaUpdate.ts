import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchemaUpdate1785146297135 implements MigrationInterface {
    name = 'SchemaUpdate1785146297135';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "player_club" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, CONSTRAINT "UQ_397d5b418ef8aa6a6011d588e16" UNIQUE ("name"), CONSTRAINT "PK_57846ed96ffbed6c42246e436e2" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "players" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "player_club_id" uuid, "team_id" uuid NOT NULL, "tournament_id" uuid NOT NULL, CONSTRAINT "PK_de22b8fdeee0c33ab55ae71da3b" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "tournament_pool" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "poolNumber" integer NOT NULL, "name" character varying, "tournament_id" uuid NOT NULL, CONSTRAINT "PK_d6a6d7f5dd4c5f30d9db6ec5e66" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "team" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "code" character varying NOT NULL, "tournament_id" uuid NOT NULL, "pool_id" uuid, CONSTRAINT "PK_f57d8293406df4af348402e4b74" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."matches_session_status_enum" AS ENUM('OPEN', 'CLOSED')`,
        );
        await queryRunner.query(
            `CREATE TABLE "matches_session" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sessionNumber" integer NOT NULL, "status" "public"."matches_session_status_enum" NOT NULL DEFAULT 'OPEN', "tournament_id" uuid NOT NULL, CONSTRAINT "PK_bd03125435af95f8aaba5a672b4" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."tournament_match_status_enum" AS ENUM('PENDING', 'ONGOING', 'ENDED', 'VALIDATED')`,
        );
        await queryRunner.query(
            `CREATE TABLE "tournament_match" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."tournament_match_status_enum" NOT NULL DEFAULT 'PENDING', "sessionNumber" integer, "plateNumber" integer, "isBye" boolean NOT NULL DEFAULT false, "scoreA" integer NOT NULL DEFAULT '0', "scoreB" integer NOT NULL DEFAULT '0', "startedAt" TIMESTAMP WITH TIME ZONE, "finishedAt" TIMESTAMP WITH TIME ZONE, "duration" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "teamAId" uuid NOT NULL, "teamBId" uuid, "tournamentId" uuid, "pool_id" uuid, "session_id" uuid, CONSTRAINT "PK_a493cbf8996a888c72f9cb46a0b" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."tournament_status_enum" AS ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."tournament_scorecalculation_enum" AS ENUM('victory_ga', 'score', 'tournament_score')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."tournament_competitionmode_enum" AS ENUM('standard', 'up_down', 'championship')`,
        );
        await queryRunner.query(
            `CREATE TABLE "tournament" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying NOT NULL, "adminPassword" character varying NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "description" character varying, "status" "public"."tournament_status_enum" NOT NULL DEFAULT 'DRAFT', "activatedAt" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "maxTeamCapacity" integer NOT NULL, "scoreCalculation" "public"."tournament_scorecalculation_enum" NOT NULL, "pointsPerGame" integer NOT NULL, "rematch" boolean NOT NULL DEFAULT true, "matchAgainstFullSameClub" boolean NOT NULL DEFAULT true, "matchAgainstPartialSameClub" boolean NOT NULL DEFAULT true, "competitionMode" "public"."tournament_competitionmode_enum" NOT NULL, "competitionConfiguration" jsonb NOT NULL, CONSTRAINT "UQ_0727d887aa0dd73d016193137c6" UNIQUE ("code"), CONSTRAINT "PK_449f912ba2b62be003f0c22e767" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "players" ADD CONSTRAINT "FK_092fe1cd8ff9978b5f3a791d5e6" FOREIGN KEY ("player_club_id") REFERENCES "player_club"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "players" ADD CONSTRAINT "FK_ce457a554d63e92f4627d6c5763" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "players" ADD CONSTRAINT "FK_a75155d64c0d1dcb737dd97fbc4" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "tournament_pool" ADD CONSTRAINT "FK_e5fb60740686993a6355df38b8b" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "team" ADD CONSTRAINT "FK_f24aaa8a7c9f61441f164b71c86" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "team" ADD CONSTRAINT "FK_2252f5124b2648ed385d7a293d3" FOREIGN KEY ("pool_id") REFERENCES "tournament_pool"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "matches_session" ADD CONSTRAINT "FK_049ce690e6f8b1688bd24b894e5" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "tournament_match" ADD CONSTRAINT "FK_9ec23e1444671d685a9bfc5d4eb" FOREIGN KEY ("teamAId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "tournament_match" ADD CONSTRAINT "FK_37a453cf73f9ffd36cb1986d8ff" FOREIGN KEY ("teamBId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "tournament_match" ADD CONSTRAINT "FK_798f3a43f03fef1d3b716b49cbf" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "tournament_match" ADD CONSTRAINT "FK_46471bbd1d5cae2d2d740709855" FOREIGN KEY ("pool_id") REFERENCES "tournament_pool"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "tournament_match" ADD CONSTRAINT "FK_530331ac0535ab459aaeea2dc6d" FOREIGN KEY ("session_id") REFERENCES "matches_session"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "tournament_match" DROP CONSTRAINT "FK_530331ac0535ab459aaeea2dc6d"`,
        );
        await queryRunner.query(
            `ALTER TABLE "tournament_match" DROP CONSTRAINT "FK_46471bbd1d5cae2d2d740709855"`,
        );
        await queryRunner.query(
            `ALTER TABLE "tournament_match" DROP CONSTRAINT "FK_798f3a43f03fef1d3b716b49cbf"`,
        );
        await queryRunner.query(
            `ALTER TABLE "tournament_match" DROP CONSTRAINT "FK_37a453cf73f9ffd36cb1986d8ff"`,
        );
        await queryRunner.query(
            `ALTER TABLE "tournament_match" DROP CONSTRAINT "FK_9ec23e1444671d685a9bfc5d4eb"`,
        );
        await queryRunner.query(
            `ALTER TABLE "matches_session" DROP CONSTRAINT "FK_049ce690e6f8b1688bd24b894e5"`,
        );
        await queryRunner.query(
            `ALTER TABLE "team" DROP CONSTRAINT "FK_2252f5124b2648ed385d7a293d3"`,
        );
        await queryRunner.query(
            `ALTER TABLE "team" DROP CONSTRAINT "FK_f24aaa8a7c9f61441f164b71c86"`,
        );
        await queryRunner.query(
            `ALTER TABLE "tournament_pool" DROP CONSTRAINT "FK_e5fb60740686993a6355df38b8b"`,
        );
        await queryRunner.query(
            `ALTER TABLE "players" DROP CONSTRAINT "FK_a75155d64c0d1dcb737dd97fbc4"`,
        );
        await queryRunner.query(
            `ALTER TABLE "players" DROP CONSTRAINT "FK_ce457a554d63e92f4627d6c5763"`,
        );
        await queryRunner.query(
            `ALTER TABLE "players" DROP CONSTRAINT "FK_092fe1cd8ff9978b5f3a791d5e6"`,
        );
        await queryRunner.query(`DROP TABLE "tournament"`);
        await queryRunner.query(`DROP TYPE "public"."tournament_competitionmode_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tournament_scorecalculation_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tournament_status_enum"`);
        await queryRunner.query(`DROP TABLE "tournament_match"`);
        await queryRunner.query(`DROP TYPE "public"."tournament_match_status_enum"`);
        await queryRunner.query(`DROP TABLE "matches_session"`);
        await queryRunner.query(`DROP TYPE "public"."matches_session_status_enum"`);
        await queryRunner.query(`DROP TABLE "team"`);
        await queryRunner.query(`DROP TABLE "tournament_pool"`);
        await queryRunner.query(`DROP TABLE "players"`);
        await queryRunner.query(`DROP TABLE "player_club"`);
    }
}
