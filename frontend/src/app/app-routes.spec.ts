import { describe, expect, it } from 'vitest';
import { routes } from './app-routes';

describe('routes', () => {
  // The router keeps the first match: `spectateur/:tournamentCode` would read "training" as a
  // tournament code if it came first.
  it('declares the training spectator routes before the tournament one', () => {
    const indexOf = (path: string) => routes.findIndex((route) => route.path === path);

    expect(indexOf('spectateur/training')).toBeGreaterThanOrEqual(0);
    expect(indexOf('spectateur/training')).toBeLessThan(indexOf('spectateur/:tournamentCode'));
  });
});
