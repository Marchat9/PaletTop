import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CompetitionMode } from 'src/enum/tounament.enum';
import { PlanPreviewDto } from './plan-preview.dto';

function errors(body: object): string[] {
    const dto = plainToInstance(PlanPreviewDto, body);
    return validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).flatMap((error) =>
        Object.keys(error.constraints ?? {}),
    );
}

const body = {
    competitionMode: CompetitionMode.STANDARD,
    competitionConfiguration: {
        numberOfQualifyingRounds: 4,
        consolationCount: 2,
        hasChallenges: true,
        hasThirdPlaceMatch: true,
    },
    teamCount: 128,
    targetCount: 128,
};

describe('PlanPreviewDto', () => {
    it('accepts the body sent by the creation form', () => {
        expect(errors(body)).toEqual([]);
    });

    it('accepts a single team (the plan itself reports it as impossible)', () => {
        expect(errors({ ...body, teamCount: 1 })).toEqual([]);
    });

    it('refuses fewer than 1 team', () => {
        expect(errors({ ...body, teamCount: 0 })).toContain('min');
    });

    it('refuses more teams than the absolute maximum', () => {
        expect(errors({ ...body, teamCount: 257 })).toContain('max');
    });

    it('refuses a missing or invalid target', () => {
        expect(errors({ ...body, targetCount: undefined })).toContain('isInt');
        expect(errors({ ...body, targetCount: 0 })).toContain('min');
    });

    it('validates the competition configuration against the mode', () => {
        const bad = {
            ...body,
            competitionConfiguration: { ...body.competitionConfiguration, consolationCount: -1 },
        };
        expect(errors(bad)).toContain('competitionConfiguration');
        expect(errors({ ...body, competitionMode: 'nope' })).toContain('isEnum');
    });
});
