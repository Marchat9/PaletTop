import { describe, expect, it } from 'vitest';
import { groupOrder } from './group-order.util';

describe('groupOrder', () => {
  it('orders the groups like the backend: principale, 3rd place, challenge, then each consolation and its challenge', () => {
    const keys = [
      'challenge_consolante_2',
      'consolante_2',
      'challenge_consolante_1',
      'consolante_1',
      'challenge_principale',
      'third_place_match',
      'principale',
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

  it('pins the order of consolante_2 and challenge_consolante_1', () => {
    expect(groupOrder('consolante_1')).toBe(4);
    expect(groupOrder('challenge_consolante_1')).toBe(5);
    expect(groupOrder('consolante_2')).toBe(6);
    expect(groupOrder('challenge_consolante_2')).toBe(7);
  });

  it('sends an unknown key last', () => {
    expect(groupOrder('whatever')).toBeGreaterThan(groupOrder('challenge_consolante_26'));
  });
});
