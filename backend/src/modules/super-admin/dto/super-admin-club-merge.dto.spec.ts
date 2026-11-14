import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { SuperAdminClubMergeDto } from './super-admin-club-merge.dto';

const SOURCE_ID = '22222222-2222-4222-8222-222222222222';

function validate(body: object): { dto: SuperAdminClubMergeDto; errors: string[] } {
    const dto = plainToInstance(SuperAdminClubMergeDto, body);
    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).flatMap((e) =>
        Object.values(e.constraints ?? {}),
    );
    return { dto, errors };
}

describe('SuperAdminClubMergeDto', () => {
    it('requires password', () => {
        expect(validate({ sourceClubId: SOURCE_ID }).errors.length).toBeGreaterThan(0);
        expect(validate({ password: '', sourceClubId: SOURCE_ID }).errors.length).toBeGreaterThan(
            0,
        );
    });

    it('requires a UUID sourceClubId', () => {
        expect(validate({ password: 'pwd' }).errors.length).toBeGreaterThan(0);
        expect(validate({ password: 'pwd', sourceClubId: 'abc' }).errors.length).toBeGreaterThan(0);
    });

    it('accepts a missing newName', () => {
        expect(validate({ password: 'pwd', sourceClubId: SOURCE_ID }).errors).toEqual([]);
    });

    it('rejects a blank newName', () => {
        expect(
            validate({ password: 'pwd', sourceClubId: SOURCE_ID, newName: '   ' }).errors.length,
        ).toBeGreaterThan(0);
    });

    it('rejects a newName longer than 150', () => {
        expect(
            validate({ password: 'pwd', sourceClubId: SOURCE_ID, newName: 'a'.repeat(151) }).errors
                .length,
        ).toBeGreaterThan(0);
    });

    it('trims the newName', () => {
        const { dto, errors } = validate({
            password: 'pwd',
            sourceClubId: SOURCE_ID,
            newName: '  Palet Club ',
        });
        expect(errors).toEqual([]);
        expect(dto.newName).toBe('Palet Club');
    });
});
