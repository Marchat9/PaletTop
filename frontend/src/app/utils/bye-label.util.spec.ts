import { byeLabelOf } from './bye-label.util';

describe('byeLabelOf', () => {
  it('shows a training rest as a rest', () => {
    expect(byeLabelOf({ isRest: true })).toBe('Au repos ce round');
  });

  it('shows a tournament bye as an exempt, with its win when it is worth one', () => {
    expect(byeLabelOf({ byeWin: true })).toBe('Exempté (victoire)');
    expect(byeLabelOf({})).toBe('Exempté');
  });
});
