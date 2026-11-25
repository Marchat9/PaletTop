import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { StartTournamentDto, StructuredStartOptions } from './start-tournament.dto';

/** The global validation pipe of the application (main.ts). */
const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
const parse = (body: object): Promise<StartTournamentDto> =>
    pipe.transform(body, {
        type: 'body',
        metatype: StartTournamentDto,
    }) as Promise<StartTournamentDto>;

describe('Start request validation by competition mode', () => {
    it('reads the options of a structured tournament as numbers', async () => {
        const dto = await parse({
            password: 'pw',
            competitionMode: 'standard',
            competitionModeStartOptions: {
                expectedTeamCount: '12',
                consolationCount: 2,
                eliminatedAfterQualifying: 3,
            },
        });

        expect(dto.competitionModeStartOptions).toBeInstanceOf(StructuredStartOptions);
        expect({ ...dto.competitionModeStartOptions }).toEqual({
            expectedTeamCount: 12,
            consolationCount: 2,
            eliminatedAfterQualifying: 3,
        });
    });

    it('accepts the password and the mode only, in every mode', async () => {
        for (const competitionMode of ['standard', 'up_down', 'championship']) {
            const dto = await parse({ password: 'pw', competitionMode });
            expect(dto.competitionModeStartOptions).toBeUndefined();
        }
    });

    it('refuses any option for a mode without options', async () => {
        for (const competitionMode of ['up_down', 'championship']) {
            await expect(
                parse({
                    password: 'pw',
                    competitionMode,
                    competitionModeStartOptions: { consolationCount: 1 },
                }),
            ).rejects.toThrow(BadRequestException);
            const none = await parse({
                password: 'pw',
                competitionMode,
                competitionModeStartOptions: null,
            });
            expect(none.competitionModeStartOptions).toBeNull();
        }
    });

    it('refuses a value out of range, an unknown field, a missing password or mode', async () => {
        const options = (competitionModeStartOptions: object) => ({
            password: 'pw',
            competitionMode: 'standard',
            competitionModeStartOptions,
        });

        await expect(parse(options({ consolationCount: -1 }))).rejects.toThrow(BadRequestException);
        await expect(parse(options({ expectedTeamCount: -1 }))).rejects.toThrow(
            BadRequestException,
        );
        await expect(parse(options({ unknown: 1 }))).rejects.toThrow(BadRequestException);
        await expect(parse({ competitionMode: 'standard' })).rejects.toThrow(BadRequestException);
        await expect(parse({ password: 'pw' })).rejects.toThrow(BadRequestException);
        await expect(parse({ password: 'pw', competitionMode: 'bowling' })).rejects.toThrow(
            BadRequestException,
        );
    });
});
