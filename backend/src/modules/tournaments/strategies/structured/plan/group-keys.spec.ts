import { describe, expect, it } from 'vitest';
import { bracketKey, challengeKey } from './structured-plan';
import { groupLabel, groupOrder } from './group-keys';

describe('groupOrder', () => {
    it('orders a 3-bracket set: principale, 3rd place, challenge, then each consolation with its challenge', () => {
        const keys = [
            challengeKey(2),
            bracketKey(2),
            bracketKey(1),
            'third_place_match',
            challengeKey(1),
            challengeKey(0),
            bracketKey(0),
        ];
        expect([...keys].sort((a, b) => groupOrder(a) - groupOrder(b))).toEqual([
            'principale',
            'third_place_match',
            'challenge_principale',
            'consolante_1',
            'challenge_consolante_1',
            'consolante_2',
            'challenge_consolante_2',
        ]);
    });

    it('keeps the legacy names sorted as before', () => {
        const legacy = [
            'challenge_consolante',
            'consolante',
            'challenge',
            'third_place_match',
            'principale',
        ];
        expect([...legacy].sort((a, b) => groupOrder(a) - groupOrder(b))).toEqual([
            'principale',
            'third_place_match',
            'challenge',
            'consolante',
            'challenge_consolante',
        ]);
    });
});

describe('groupLabel', () => {
    it('labels index-based and legacy keys', () => {
        expect(groupLabel('principale')).toBe('Principale');
        expect(groupLabel('challenge_principale')).toBe('Challenge principale');
        expect(groupLabel('consolante_1')).toBe('Consolante A');
        expect(groupLabel('challenge_consolante_2')).toBe('Challenge consolante B');
        expect(groupLabel('consolante')).toBe('Consolante');
        expect(groupLabel('qualifying')).toBeNull();
    });
});
