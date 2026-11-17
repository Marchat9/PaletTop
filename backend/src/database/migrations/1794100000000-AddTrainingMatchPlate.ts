import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrainingMatchPlate1794100000000 implements MigrationInterface {
    name = 'AddTrainingMatchPlate1794100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "training_match" ADD "plateNumber" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "training_match" DROP COLUMN "plateNumber"`);
    }
}
