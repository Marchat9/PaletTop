import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClubToTeam1788628755936 implements MigrationInterface {
    name = 'AddClubToTeam1788628755936';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "team" ADD "club" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "team" DROP COLUMN "club"`);
    }
}
