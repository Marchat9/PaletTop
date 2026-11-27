import { describe, expect, it } from 'vitest';
import {
  selectSkipRoundConfirmation,
  selectSpectatorShowPodium,
  SKIP_ROUND_CONFIRMATION_STORAGE_KEY,
  SPECTATOR_PODIUM_STORAGE_KEY,
} from './app-config.selectors';

describe('selectSkipRoundConfirmation', () => {
  it('asks for every round until the admin opts out', () => {
    expect(selectSkipRoundConfirmation.projector({})).toEqual({ tournament: [], training: [] });
  });

  it('ignores a stored value of an unexpected shape', () => {
    expect(
      selectSkipRoundConfirmation.projector({ [SKIP_ROUND_CONFIRMATION_STORAGE_KEY]: 'oops' }),
    ).toEqual({ tournament: [], training: [] });
    expect(
      selectSkipRoundConfirmation.projector({
        [SKIP_ROUND_CONFIRMATION_STORAGE_KEY]: { tournament: 'ABCD', training: [12] },
      }),
    ).toEqual({ tournament: [], training: [] });
  });

  it('follows the stored codes', () => {
    expect(
      selectSkipRoundConfirmation.projector({
        [SKIP_ROUND_CONFIRMATION_STORAGE_KEY]: { tournament: ['ABCD'], training: ['XY12'] },
      }),
    ).toEqual({ tournament: ['ABCD'], training: ['XY12'] });
  });
});

describe('selectSpectatorShowPodium', () => {
  it('hides the podium until the spectator turns it on', () => {
    expect(selectSpectatorShowPodium.projector({})).toBe(false);
  });

  it('follows the stored choice', () => {
    expect(selectSpectatorShowPodium.projector({ [SPECTATOR_PODIUM_STORAGE_KEY]: true })).toBe(
      true,
    );
    expect(selectSpectatorShowPodium.projector({ [SPECTATOR_PODIUM_STORAGE_KEY]: false })).toBe(
      false,
    );
  });
});
