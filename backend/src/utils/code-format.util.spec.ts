import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateTrainingDto } from 'src/modules/training/dto/create-training.dto';

function codeErrors(code: string): string[] {
    const dto = plainToInstance(CreateTrainingDto, { code, name: 'n', adminPassword: 'p' });
    return validateSync(dto)
        .filter((error) => error.property === 'code')
        .flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('code format', () => {
    it.each(['PALET-2026', 'OPEN DE NANTES', 'CLUB_A 2'])('accepts "%s"', (code) => {
        expect(codeErrors(code)).toEqual([]);
    });

    it.each(['A/B', 'CODE?', 'É-2026', 'PALET#1'])('refuses "%s"', (code) => {
        expect(codeErrors(code).join()).toContain('lettres, des chiffres');
    });
});
