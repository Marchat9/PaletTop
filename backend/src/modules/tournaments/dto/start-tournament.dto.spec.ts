import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CompetitionMode } from 'src/enum/tounament.enum';
import { StartTournamentDto, startChoiceOf } from './start-tournament.dto';

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

    it('refuses a value out of range for the mode, without asking the password again', () => {
        expect(() => startChoiceOf(CompetitionMode.STANDARD, { consolationCount: -1 })).toThrow(
            BadRequestException,
        );
        expect(startChoiceOf(CompetitionMode.STANDARD, { consolationCount: '2' as never })).toEqual(
            { consolationCount: 2, eliminatedAfterQualifying: undefined },
        );
    });

    it('lets the global pipe through the choice fields, the mode checking their values', () => {
        const errors = (body: object) =>
            validateSync(plainToInstance(StartTournamentDto as never, body), {
                whitelist: true,
                forbidNonWhitelisted: true,
            });

        expect(errors({ password: 'pw', consolationCount: '2' })).toHaveLength(0);
        expect(errors({ password: 'pw', consolationCount: -1 })).toHaveLength(0);
        expect(errors({ consolationCount: 1 })).not.toHaveLength(0);
        expect(errors({ password: 'pw', unknown: 1 })).not.toHaveLength(0);
    });
});
