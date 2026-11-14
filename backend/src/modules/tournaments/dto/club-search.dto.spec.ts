import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ClubSearchDto } from './club-search.dto';

function validate(body: object): { dto: ClubSearchDto; errors: string[] } {
    const dto = plainToInstance(ClubSearchDto, body);
    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).flatMap((e) =>
        Object.values(e.constraints ?? {}),
    );
    return { dto, errors };
}

describe('ClubSearchDto', () => {
    it('rejects a missing password', () => {
        expect(validate({ search: 'pal' }).errors.length).toBeGreaterThan(0);
    });

    it('rejects an empty password', () => {
        expect(validate({ password: '' }).errors.length).toBeGreaterThan(0);
    });

    it('accepts a missing search', () => {
        expect(validate({ password: 'pwd' }).errors).toEqual([]);
    });

    it('accepts an empty search', () => {
        expect(validate({ password: 'pwd', search: '' }).errors).toEqual([]);
    });

    it('rejects a search longer than 150', () => {
        expect(
            validate({ password: 'pwd', search: 'a'.repeat(151) }).errors.length,
        ).toBeGreaterThan(0);
    });

    it('trims the search', () => {
        expect(validate({ password: 'pwd', search: '  pal ' }).dto.search).toBe('pal');
    });
});
