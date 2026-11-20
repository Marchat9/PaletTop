import { MigrationInterface, QueryRunner } from 'typeorm';

const CODE_LENGTH = 4;
const CODE_SPACE = 10 ** CODE_LENGTH;

interface MemberRow {
    id: string;
    training_id: string;
}

/**
 * Club members keep one participant code for every training session. Existing members get a
 * random code, unique within their club (sequential codes would be guessable by the other members).
 */
export class AddTrainingMemberCode1794400000000 implements MigrationInterface {
    name = 'AddTrainingMemberCode1794400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "training_member" ADD "code" character varying(${CODE_LENGTH})`,
        );

        const members: MemberRow[] = await queryRunner.query(
            `SELECT "id", "training_id" FROM "training_member" ORDER BY "createdAt"`,
        );
        const takenByTraining = new Map<string, Set<string>>();
        for (const member of members) {
            const taken = takenByTraining.get(member.training_id) ?? new Set<string>();
            takenByTraining.set(member.training_id, taken);
            const code = drawFreeCode(taken);
            taken.add(code);
            await queryRunner.query(`UPDATE "training_member" SET "code" = $1 WHERE "id" = $2`, [
                code,
                member.id,
            ]);
        }

        await queryRunner.query(`ALTER TABLE "training_member" ALTER COLUMN "code" SET NOT NULL`);
        await queryRunner.query(
            `ALTER TABLE "training_member" ADD CONSTRAINT "UQ_training_member_training_code" UNIQUE ("training_id", "code")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "training_member" DROP CONSTRAINT "UQ_training_member_training_code"`,
        );
        await queryRunner.query(`ALTER TABLE "training_member" DROP COLUMN "code"`);
    }
}

// Self-contained on purpose: a migration must not change if the app's code generator does.
function drawFreeCode(taken: Set<string>): string {
    if (taken.size >= CODE_SPACE) {
        throw new Error('No participant code left for a training club');
    }
    let code: string;
    do {
        code = Math.floor(Math.random() * CODE_SPACE)
            .toString()
            .padStart(CODE_LENGTH, '0');
    } while (taken.has(code));
    return code;
}
