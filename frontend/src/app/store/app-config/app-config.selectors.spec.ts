import { describe, expect, it } from 'vitest';
import { selectSpectatorShowPodium, SPECTATOR_PODIUM_STORAGE_KEY } from './app-config.selectors';

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
