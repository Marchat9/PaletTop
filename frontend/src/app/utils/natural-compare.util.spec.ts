import { compareNatural } from './natural-compare.util';

describe('compareNatural', () => {
  it('orders numbered names by their number, not character by character', () => {
    expect(['Equipe 11', 'Equipe 2', 'Equipe 1'].sort(compareNatural)).toEqual([
      'Equipe 1',
      'Equipe 2',
      'Equipe 11',
    ]);
  });

  it('ignores case and accents', () => {
    expect(['équipe B', 'Equipe a', 'EQUIPE c'].sort(compareNatural)).toEqual([
      'Equipe a',
      'équipe B',
      'EQUIPE c',
    ]);
  });
});
