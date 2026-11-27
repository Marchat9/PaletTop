import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the position of a match in its elimination round: match `k` of a round takes the winners
 * of positions `2k` and `2k + 1` of the previous one. Null for the qualifying matches and for
 * everything played before the brackets became fixed trees.
 */
export class AddBracketPosition1794700000000 implements MigrationInterface {
    name = 'AddBracketPosition1794700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tournament_match" ADD "bracketPosition" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tournament_match" DROP COLUMN "bracketPosition"`);
    }
}
