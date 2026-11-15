import { describe, expect, it } from 'vitest';
import { getPlayerNameError, getTeamClubError } from './team-form.validation';

describe('getPlayerNameError', () => {
  it('returns the message with a 1-based player number when the name is blank and visible', () => {
    expect(getPlayerNameError(0, '', true)).toBe(
      'Renseignez le nom du joueur 1, ou retirez la ligne.',
    );
    expect(getPlayerNameError(2, '   ', true)).toBe(
      'Renseignez le nom du joueur 3, ou retirez la ligne.',
    );
  });

  it('returns null when not visible', () => {
    expect(getPlayerNameError(0, '', false)).toBeNull();
  });

  it('returns null when the name is filled', () => {
    expect(getPlayerNameError(0, 'Alice', true)).toBeNull();
  });
});

describe('getTeamClubError', () => {
  it('returns the message in championship with an empty club when visible', () => {
    expect(getTeamClubError(true, '', true)).toBe("Choisissez le club pour créer l'équipe.");
  });

  it('returns null when not visible, not championship or club chosen', () => {
    expect(getTeamClubError(true, '', false)).toBeNull();
    expect(getTeamClubError(false, '', true)).toBeNull();
    expect(getTeamClubError(true, 'Home', true)).toBeNull();
  });
});
