import { describe, expect, it } from 'vitest';
import { fitCount } from './fit-count.directive';

describe('fitCount', () => {
  it('compte les éléments entiers qui tiennent une fois la place réservée retirée', () => {
    // 500px - 40px reserved = 460px, 44px items: 10 fit (the 11th would be cut).
    expect(fitCount(500, 44, 40, 1)).toBe(10);
  });

  it('multiplie par le nombre de colonnes', () => {
    expect(fitCount(500, 44, 40, 2)).toBe(20);
  });

  it('en garde toujours au moins un par colonne, même sans place', () => {
    expect(fitCount(20, 44, 40, 2)).toBe(2);
  });

  it('ne divise pas par zéro sur une hauteur d’élément nulle', () => {
    expect(fitCount(500, 0, 0, 1)).toBe(1);
  });
});
