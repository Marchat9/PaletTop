import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchemaUpdate1788541025579 implements MigrationInterface {
    name = 'SchemaUpdate1788541025579';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "training_member" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "training_id" uuid NOT NULL, CONSTRAINT "PK_8a17eb764e8673441eda002063a" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."training_participant_status_enum" AS ENUM('PRESENT', 'LEFT')`,
        );
        await queryRunner.query(
            `CREATE TABLE "training_participant" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "code" character varying NOT NULL, "status" "public"."training_participant_status_enum" NOT NULL DEFAULT 'PRESENT', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "session_id" uuid NOT NULL, "member_id" uuid, CONSTRAINT "UQ_7b3b4aae57581db06e10fdc1e36" UNIQUE ("session_id", "code"), CONSTRAINT "PK_caf92026880c7ab091fbd9c2273" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_training_participant_active_member" ON "training_participant" ("session_id", "member_id") WHERE "status" = 'PRESENT'`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."training_match_status_enum" AS ENUM('PENDING', 'ONGOING', 'ENDED', 'VALIDATED')`,
        );
        await queryRunner.query(
            `CREATE TABLE "training_match" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."training_match_status_enum" NOT NULL DEFAULT 'PENDING', "isBye" boolean NOT NULL DEFAULT false, "scoreA" integer NOT NULL DEFAULT '0', "scoreB" integer NOT NULL DEFAULT '0', "startedAt" TIMESTAMP WITH TIME ZONE, "finishedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "round_id" uuid NOT NULL, "session_id" uuid NOT NULL, "team_a_id" uuid NOT NULL, "team_b_id" uuid, CONSTRAINT "PK_73220eed0b964c2c6d8a80aade7" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."training_round_status_enum" AS ENUM('OPEN', 'CLOSED')`,
        );
        await queryRunner.query(
            `CREATE TABLE "training_round" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roundNumber" integer NOT NULL, "status" "public"."training_round_status_enum" NOT NULL DEFAULT 'OPEN', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "session_id" uuid NOT NULL, CONSTRAINT "UQ_9af5f209ab32b551a23ac3c3fbe" UNIQUE ("session_id", "roundNumber"), CONSTRAINT "PK_6fd10fa9d8bc58b40b9b229744d" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."training_team_member_kind_enum" AS ENUM('FIXED', 'EPHEMERAL')`,
        );
        await queryRunner.query(
            `CREATE TABLE "training_team_member" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "leftAt" TIMESTAMP WITH TIME ZONE, "kind" "public"."training_team_member_kind_enum" NOT NULL, "team_id" uuid NOT NULL, "participant_id" uuid NOT NULL, CONSTRAINT "UQ_af2b46d70a96b5652e6fbf0bf77" UNIQUE ("team_id", "participant_id"), CONSTRAINT "PK_0f4fb3b0100496335ed019942b8" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_training_team_member_active_fixed_participant" ON "training_team_member" ("participant_id") WHERE "leftAt" IS NULL AND "kind" = 'FIXED'`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."training_team_kind_enum" AS ENUM('FIXED', 'EPHEMERAL')`,
        );
        await queryRunner.query(
            `CREATE TABLE "training_team" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "kind" "public"."training_team_kind_enum" NOT NULL, "name" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "session_id" uuid NOT NULL, "round_id" uuid, CONSTRAINT "PK_fd27a13877c6117865c26c6ff32" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."training_session_status_enum" AS ENUM('OPEN', 'CLOSED')`,
        );
        await queryRunner.query(
            `CREATE TABLE "training_session" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."training_session_status_enum" NOT NULL DEFAULT 'OPEN', "playersPerTeam" integer NOT NULL, "fallbackTeamSize" integer NOT NULL, "allowSitOut" boolean NOT NULL DEFAULT false, "avoidSamePartnerConsecutive" boolean NOT NULL DEFAULT true, "avoidSameOpponentConsecutive" boolean NOT NULL DEFAULT true, "pointsPerGame" integer NOT NULL, "lastActivityAt" TIMESTAMP WITH TIME ZONE NOT NULL, "closedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "training_id" uuid NOT NULL, CONSTRAINT "UQ_6fecc1190baf586bf61310aa88c" UNIQUE ("code"), CONSTRAINT "PK_a17a9657ff5a6e048bfd82c4651" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "training" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying NOT NULL, "club" character varying, "adminPassword" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_603d5cfbfa4973da0a2e4d76873" UNIQUE ("code"), CONSTRAINT "PK_c436c96be3adf1aa439ef471427" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_member" ADD CONSTRAINT "FK_0ff0f4d710874db8c12eecc87a2" FOREIGN KEY ("training_id") REFERENCES "training"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_participant" ADD CONSTRAINT "FK_fac11cc12209f71e8002ae0ca77" FOREIGN KEY ("session_id") REFERENCES "training_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_participant" ADD CONSTRAINT "FK_c04d131455ad2782bab1d0bcafe" FOREIGN KEY ("member_id") REFERENCES "training_member"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_match" ADD CONSTRAINT "FK_e2e89d55e710a53d99f9a6f4d92" FOREIGN KEY ("round_id") REFERENCES "training_round"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_match" ADD CONSTRAINT "FK_048189a70b51f91d54898f0b8f5" FOREIGN KEY ("session_id") REFERENCES "training_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_match" ADD CONSTRAINT "FK_6949e74e93a6d1a329fc0898cb6" FOREIGN KEY ("team_a_id") REFERENCES "training_team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_match" ADD CONSTRAINT "FK_27fd127eb909a9d012741bc1f58" FOREIGN KEY ("team_b_id") REFERENCES "training_team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_round" ADD CONSTRAINT "FK_2ca86c75053afbbbd4a212e2280" FOREIGN KEY ("session_id") REFERENCES "training_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_team_member" ADD CONSTRAINT "FK_233cef754868d3ee977d1e5b4ba" FOREIGN KEY ("team_id") REFERENCES "training_team"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_team_member" ADD CONSTRAINT "FK_59f1fac56c480ab012c37b83ad0" FOREIGN KEY ("participant_id") REFERENCES "training_participant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_team" ADD CONSTRAINT "FK_8d5a5bf52c68ea2c0a4dbd76c69" FOREIGN KEY ("session_id") REFERENCES "training_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_team" ADD CONSTRAINT "FK_5389259afd7e3335433383fea65" FOREIGN KEY ("round_id") REFERENCES "training_round"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_session" ADD CONSTRAINT "FK_1aae02e18ead8406f563eee93ca" FOREIGN KEY ("training_id") REFERENCES "training"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "training_session" DROP CONSTRAINT "FK_1aae02e18ead8406f563eee93ca"`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_team" DROP CONSTRAINT "FK_5389259afd7e3335433383fea65"`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_team" DROP CONSTRAINT "FK_8d5a5bf52c68ea2c0a4dbd76c69"`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_team_member" DROP CONSTRAINT "FK_59f1fac56c480ab012c37b83ad0"`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_team_member" DROP CONSTRAINT "FK_233cef754868d3ee977d1e5b4ba"`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_round" DROP CONSTRAINT "FK_2ca86c75053afbbbd4a212e2280"`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_match" DROP CONSTRAINT "FK_27fd127eb909a9d012741bc1f58"`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_match" DROP CONSTRAINT "FK_6949e74e93a6d1a329fc0898cb6"`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_match" DROP CONSTRAINT "FK_048189a70b51f91d54898f0b8f5"`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_match" DROP CONSTRAINT "FK_e2e89d55e710a53d99f9a6f4d92"`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_participant" DROP CONSTRAINT "FK_c04d131455ad2782bab1d0bcafe"`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_participant" DROP CONSTRAINT "FK_fac11cc12209f71e8002ae0ca77"`,
        );
        await queryRunner.query(
            `ALTER TABLE "training_member" DROP CONSTRAINT "FK_0ff0f4d710874db8c12eecc87a2"`,
        );
        await queryRunner.query(`DROP TABLE "training"`);
        await queryRunner.query(`DROP TABLE "training_session"`);
        await queryRunner.query(`DROP TYPE "public"."training_session_status_enum"`);
        await queryRunner.query(`DROP TABLE "training_team"`);
        await queryRunner.query(`DROP TYPE "public"."training_team_kind_enum"`);
        await queryRunner.query(
            `DROP INDEX "public"."UQ_training_team_member_active_fixed_participant"`,
        );
        await queryRunner.query(`DROP TABLE "training_team_member"`);
        await queryRunner.query(`DROP TYPE "public"."training_team_member_kind_enum"`);
        await queryRunner.query(`DROP TABLE "training_round"`);
        await queryRunner.query(`DROP TYPE "public"."training_round_status_enum"`);
        await queryRunner.query(`DROP TABLE "training_match"`);
        await queryRunner.query(`DROP TYPE "public"."training_match_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_training_participant_active_member"`);
        await queryRunner.query(`DROP TABLE "training_participant"`);
        await queryRunner.query(`DROP TYPE "public"."training_participant_status_enum"`);
        await queryRunner.query(`DROP TABLE "training_member"`);
    }
}
