import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CompetitionMode } from 'src/enum/tounament.enum';
import { StructuredStartTournamentDto, startChoiceOf } from './start-tournament.dto';

describe('Start request by tournament mode', () => {
    it('reads the launch choice of a structured tournament', () => {
        expect(
            startChoiceOf(CompetitionMode.STANDARD, {
                consolationCount: 2,
                eliminatedAfterQualifying: 3,
            }),
        ).toEqual({ consolationCount: 2, eliminatedAfterQualifying: 3 });
    });

    it('has no choice when the request holds none, in every mode', () => {
        for (const mode of [CompetitionMode.UP_DOWN, CompetitionMode.CHAMPIONSHIP]) {
            expect(startChoiceOf(mode, { expectedTeamCount: 8 })).toEqual({});
        }
        expect(startChoiceOf(CompetitionMode.STANDARD, {})).toEqual({
            consolationCount: undefined,
            eliminatedAfterQualifying: undefined,
        });
    });

    it('refuses a launch choice for a mode that has none', () => {
        for (const mode of [CompetitionMode.UP_DOWN, CompetitionMode.CHAMPIONSHIP]) {
            expect(() => startChoiceOf(mode, { consolationCount: 1 })).toThrow(BadRequestException);
            expect(() => startChoiceOf(mode, { eliminatedAfterQualifying: 1 })).toThrow(
                BadRequestException,
            );
        }
    });

    it('checks the values and the password whatever the mode', () => {
        const errors = (body: object) =>
            validateSync(plainToInstance(StructuredStartTournamentDto, body), {
                whitelist: true,
                forbidNonWhitelisted: true,
            });

        expect(errors({ password: 'pw', consolationCount: '2' })).toHaveLength(0);
        expect(errors({ password: 'pw', consolationCount: -1 })).not.toHaveLength(0);
        expect(errors({ consolationCount: 1 })).not.toHaveLength(0);
        expect(errors({ password: 'pw', unknown: 1 })).not.toHaveLength(0);
    });
});
