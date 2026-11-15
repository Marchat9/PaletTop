import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LeaderboardTable } from 'src/app/models/leaderboard.model';
import { toSessionLeaderboard } from 'src/app/utils/leaderboard.util';
import { Leaderboard } from './leaderboard';

const players = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    participantId: `P${index + 1}`,
    name: `Joueur ${index + 1}`,
    wins: count - index,
    points: 10 * (count - index),
  }));

function setup(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(Leaderboard);
  Object.entries(inputs).forEach(([key, value]) => fixture.componentRef.setInput(key, value));
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

function bodyRows(element: HTMLElement): string[][] {
  return Array.from(element.querySelectorAll('tbody tr')).map((row) =>
    Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() ?? ''),
  );
}

describe('Leaderboard', () => {
  it('liste toutes les lignes sans podium, avec les colonnes de la source', () => {
    const element = setup({ table: toSessionLeaderboard(players(2)) });

    expect(element.querySelector('.podium')).toBeNull();
    const headers = Array.from(element.querySelectorAll('thead th')).map((th) =>
      th.textContent?.trim(),
    );
    expect(headers).toEqual(['Rang#', 'Joueur', 'V', 'Pts']);
    expect(bodyRows(element)).toEqual([
      ['1', 'Joueur 1', '2', '20'],
      ['2', 'Joueur 2', '1', '10'],
    ]);
  });

  it('met les trois premiers sur le podium (2 · 1 · 3) et la suite dans le tableau', () => {
    const element = setup({ table: toSessionLeaderboard(players(5)), showPodium: true });

    const names = Array.from(element.querySelectorAll('.podium-names')).map((name) =>
      name.textContent?.trim(),
    );
    expect(names).toEqual(['Joueur 2', 'Joueur 1', 'Joueur 3']);
    expect(bodyRows(element).map((row) => row[1])).toEqual(['Joueur 4', 'Joueur 5']);
  });

  it('regroupe les ex aequo sur une marche et résume au-delà de trois noms', () => {
    const tied = ['A', 'B', 'C', 'D'].map((name) => ({
      participantId: name,
      name,
      wins: 2,
      points: 26,
    }));
    const element = setup({ table: toSessionLeaderboard(tied), showPodium: true });

    const steps = element.querySelectorAll('.podium-step');
    expect(steps).toHaveLength(1);
    expect(steps[0].querySelector('.medal')?.textContent?.trim()).toBe('1=');
    expect(steps[0].querySelector('.podium-names')?.textContent?.trim()).toBe('A · B · C +1');
  });

  it('met en surbrillance la ligne suivie, avec son badge, et la marche qui la porte', () => {
    const table = toSessionLeaderboard(players(5));
    const inTable = setup({ table, showPodium: true, highlightedId: 'P4', highlightLabel: 'vous' });

    const highlighted = inTable.querySelectorAll('tbody tr.is-highlighted');
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].textContent).toContain('Joueur 4');
    expect(highlighted[0].querySelector('.me-badge')?.textContent?.trim()).toBe('vous');

    const onPodium = setup({ table, showPodium: true, highlightedId: 'P1' });
    expect(
      onPodium.querySelector('.podium-step.is-highlighted .podium-names')?.textContent,
    ).toContain('Joueur 1');
    expect(onPodium.querySelector('tbody tr.is-highlighted')).toBeNull();
  });

  it('ne montre que la fenêtre demandée des lignes sous le podium', () => {
    const element = setup({
      table: toSessionLeaderboard(players(10)),
      showPodium: true,
      pageStart: 2,
      pageSize: 3,
    });

    expect(bodyRows(element).map((row) => row[0])).toEqual(['6', '7', '8']);
  });

  it('répartit la fenêtre sur deux tableaux côte à côte', () => {
    const element = setup({ table: toSessionLeaderboard(players(5)), listColumns: 2 });

    const tables = element.querySelectorAll('.tables.two-columns table');
    expect(tables).toHaveLength(2);
    expect(tables[0].querySelectorAll('tbody tr')).toHaveLength(3);
    expect(tables[1].querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('affiche le message vide, puis l’erreur quand il y en a une', () => {
    const empty: LeaderboardTable = { nameLabel: 'Joueur', columns: [], rows: [], legend: null };

    expect(setup({ table: empty, emptyLabel: 'Aucun match validé.' }).textContent).toContain(
      'Aucun match validé.',
    );
    expect(setup({ table: empty, error: 'Séance introuvable.' }).textContent).toContain(
      'Séance introuvable.',
    );
  });

  it('affiche la légende de la source sous le tableau', () => {
    const table: LeaderboardTable = {
      ...toSessionLeaderboard(players(1)),
      legend: 'V = victoires',
    };

    expect(setup({ table }).querySelector('.legend')?.textContent?.trim()).toBe('V = victoires');
  });

  it('projette les boutons de la page appelante', () => {
    @Component({
      imports: [Leaderboard],
      template: `<app-leaderboard [table]="table">
        <button leaderboardActions type="button">PDF</button>
      </app-leaderboard>`,
    })
    class Host {
      table = toSessionLeaderboard(players(1));
    }

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('button')?.textContent).toBe('PDF');
  });
});
