import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { AddMultipleTeamsToTournamentDto } from './add-team-to-tournament.dto';

function errors(body: object): string[] {
    const dto = plainToInstance(AddMultipleTeamsToTournamentDto, body);
    const flatten = (list: ReturnType<typeof validateSync>): string[] =>
        list.flatMap((e) => [...Object.values(e.constraints ?? {}), ...flatten(e.children ?? [])]);
    return flatten(validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }));
}

describe('AddMultipleTeamsToTournamentDto', () => {
    it('accepts the payloads sent by the team form and the Excel import', () => {
        expect(
            errors({
                password: 'pw',
                teams: [
                    { name: 'Équipe 1', club: 'Nantes', players: [{ name: 'Alice', club: '' }] },
                    { players: [{ name: 'Bob' }] },
                ],
            }),
        ).toEqual([]);
    });

    it('refuses an empty team list', () => {
        expect(errors({ password: 'pw', teams: [] })).toContain('Au moins une équipe est requise.');
    });

    it('refuses a team without players', () => {
        expect(errors({ password: 'pw', teams: [{ name: 'Vide', players: [] }] })).toContain(
            'Une équipe doit contenir au moins 1 joueur.',
        );
    });

    it('refuses a player without a name', () => {
        expect(
            errors({ password: 'pw', teams: [{ players: [{ name: '' }] }] }).length,
        ).toBeGreaterThan(0);
    });
});
