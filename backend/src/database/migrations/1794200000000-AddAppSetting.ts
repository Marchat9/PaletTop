import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppSetting1794200000000 implements MigrationInterface {
    name = 'AddAppSetting1794200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."app_setting_scope_enum" AS ENUM('public', 'super_admin', 'internal')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."app_setting_source_enum" AS ENUM('app_default', 'super_admin', 'migration', 'env')`,
        );
        await queryRunner.query(
            `CREATE TABLE "app_setting" (
                "key" character varying NOT NULL,
                "value" jsonb NOT NULL,
                "scope" "public"."app_setting_scope_enum" NOT NULL,
                "source" "public"."app_setting_source_enum" NOT NULL,
                "sourceDetail" character varying,
                "appVersion" character varying,
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_app_setting_key" PRIMARY KEY ("key")
            )`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "app_setting"`);
        await queryRunner.query(`DROP TYPE "public"."app_setting_source_enum"`);
        await queryRunner.query(`DROP TYPE "public"."app_setting_scope_enum"`);
    }
}
