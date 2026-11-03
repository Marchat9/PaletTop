import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrainingAdminMember1793743196625 implements MigrationInterface {
    name = 'AddTrainingAdminMember1793743196625';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "training" ADD "admin_member_id" uuid`);
        await queryRunner.query(
            `ALTER TABLE "training" ADD CONSTRAINT "FK_729972bdd6863cc891e818c55f9" FOREIGN KEY ("admin_member_id") REFERENCES "training_member"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "training" DROP CONSTRAINT "FK_729972bdd6863cc891e818c55f9"`,
        );
        await queryRunner.query(`ALTER TABLE "training" DROP COLUMN "admin_member_id"`);
    }
}
