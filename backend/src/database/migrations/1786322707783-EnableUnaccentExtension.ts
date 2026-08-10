import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableUnaccentExtension1786322707783 implements MigrationInterface {
    name = 'EnableUnaccentExtension1786322707783';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS unaccent;');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP EXTENSION IF EXISTS unaccent;');
    }
}
