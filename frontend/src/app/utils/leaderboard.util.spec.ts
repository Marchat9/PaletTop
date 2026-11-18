import { describe, expect, it } from 'vitest';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { LeaderboardRow } from 'src/app/models/leaderboard.model';
import { MatchGroupKey } from 'src/app/models/matches-session.model';
import {
  itemTables,
  leaderboardItems,
  pageRankLabel,
  podiumSteps,
  rowsBelowPodium,
  toClubLeaderboard,
  toSessionLeaderboard,
  toTournamentLeaderboard,
} from './leaderboard.util';

function team(rank: number, teamId: string, overrides: Partial<GlobalRankingEntry> = {}) {
  return {
    rank,
    teamId,
    teamName: `Équipe ${teamId}`,
    wins: 1,
    pointsFor: 13,
    pointsAgainst: 9,
    goalAverage: 4,
    matchesPlayed: 1,
    tournamentPoints: 3,
    buchholz: 0,
    ...overrides,
  };
}

function row(
  id: string,
  rank: number,
  rankLabel = String(rank),
  section: string | null = null,
): LeaderboardRow {
  return { id, rank, rankLabel, name: id, cells: [], summary: `${id} stats`, section };
}

function labels(items: ReturnType<typeof leaderboardItems>): string[] {
  return items.map((item) => (item.kind === 'section' ? `# ${item.label}` : item.row.id));
}

describe('toTournamentLeaderboard', () => {
  it('affiche V / Bch. / GA en victoires + Buchholz, avec la légende du Buchholz', () => {
    const table = toTournamentLeaderboard(
      [team(1, 'A', { wins: 2, buchholz: 5, goalAverage: 3 })],
      'victory_buchholz_ga',
    );

    expect(table.columns.map((column) => column.label)).toEqual(['V', 'Bch.', 'GA']);
    expect(table.columns[1].title).toBe('Score Buchholz (Somme des victoires des adversaires)');
    expect(table.rows[0].cells.map((cell) => cell.value)).toEqual(['2', '5', '+3']);
    expect(table.legend).toContain('Bch. = Score Buchholz (Somme des victoires des adversaires)');
  });

  it('affiche Score / Bch. / GA en somme des scores + Buchholz', () => {
    const table = toTournamentLeaderboard(
      [team(1, 'A', { pointsFor: 26, buchholz: 4, goalAverage: -2 })],
      'score_buchholz_ga',
    );

    expect(table.columns.map((column) => column.label)).toEqual(['Score', 'Bch.', 'GA']);
    expect(table.rows[0].cells.map((cell) => cell.value)).toEqual(['26', '4', '-2']);
  });

  it('affiche V / Pts+ / GA en victoires + goal average, avec le signe et la couleur du GA', () => {
    const table = toTournamentLeaderboard(
      [team(1, 'A', { goalAverage: 8 }), team(2, 'B', { wins: 0, goalAverage: -8 })],
      'victory_ga',
    );

    expect(table.nameLabel).toBe('Équipe');
    expect(table.columns.map((column) => column.label)).toEqual(['V', 'Pts+', 'GA']);
    expect(table.rows[0].cells).toEqual([
      { value: '1', tone: 'neutral' },
      { value: '13', tone: 'neutral' },
      { value: '+8', tone: 'positive' },
    ]);
    expect(table.rows[1].cells[2]).toEqual({ value: '-8', tone: 'negative' });
    expect(table.rows[0].summary).toBe('1 V · 13 · +8');
    expect(table.legend).toBe('V = victoires · Pts+ = points marqués · GA = Goal average');
  });

  it('affiche Score / GA en somme des scores', () => {
    const table = toTournamentLeaderboard([team(1, 'A', { goalAverage: 0 })], 'score');

    expect(table.columns.map((column) => column.label)).toEqual(['Score', 'GA']);
    expect(table.rows[0].cells).toEqual([
      { value: '13', tone: 'neutral' },
      { value: '0', tone: 'neutral' },
    ]);
    expect(table.legend).toBe('Score = somme des scores · GA = Goal average');
  });

  it('affiche les seuls points tournoi, sans légende', () => {
    const table = toTournamentLeaderboard([team(1, 'A')], 'tournament_score');

    expect(table.columns.map((column) => column.label)).toEqual(['Pts Tournoi']);
    expect(table.rows[0].summary).toBe('3 pts');
    expect(table.legend).toBeNull();
  });

  it('garde le rang du serveur et marque les égalités d’un « = »', () => {
    const table = toTournamentLeaderboard([team(1, 'A'), team(1, 'B'), team(3, 'C')], 'victory_ga');

    expect(table.rows.map((entry) => [entry.id, entry.rank, entry.rankLabel])).toEqual([
      ['A', 1, '1='],
      ['B', 1, '1='],
      ['C', 3, '3'],
    ]);
  });
});

describe('toSessionLeaderboard', () => {
  it('classe à égalité les joueurs aux mêmes victoires et points, le suivant saute un rang', () => {
    const table = toSessionLeaderboard([
      { participantId: 'P1', name: 'Julie', wins: 2, points: 26 },
      { participantId: 'P2', name: 'Loïc', wins: 2, points: 26 },
      { participantId: 'P3', name: 'Pierre', wins: 1, points: 26 },
      { participantId: 'P4', name: 'Léa', wins: 1, points: 20 },
    ]);

    expect(table.nameLabel).toBe('Joueur');
    expect(table.columns.map((column) => column.label)).toEqual(['V', 'Pts']);
    expect(table.rows.map((entry) => [entry.id, entry.rankLabel])).toEqual([
      ['P1', '1='],
      ['P2', '1='],
      ['P3', '3'],
      ['P4', '4'],
    ]);
    expect(table.rows[0].summary).toBe('2 V · 26 pts');
  });
});

describe('toClubLeaderboard', () => {
  it('affiche séances, victoires et points de chaque membre', () => {
    const table = toClubLeaderboard([
      { memberId: 'M1', name: 'Jean', wins: 3, points: 39, sessionsPlayed: 2 },
      { memberId: 'M2', name: 'Marie', wins: 1, points: 20, sessionsPlayed: 1 },
    ]);

    expect(table.nameLabel).toBe('Membre');
    expect(table.columns.map((column) => column.label)).toEqual(['Séances', 'V', 'Pts']);
    expect(table.rows[0].cells.map((cell) => cell.value)).toEqual(['2', '3', '39']);
    expect(table.rows.map((entry) => entry.rankLabel)).toEqual(['1', '2']);
    expect(table.rows[0].summary).toBe('39 pts');
  });
});

describe('podiumSteps', () => {
  it('dispose les trois premières places dans l’ordre 2 · 1 · 3', () => {
    const steps = podiumSteps([row('A', 1), row('B', 2), row('C', 3), row('D', 4)]);

    expect(steps.map((step) => [step.place, step.names])).toEqual([
      [2, ['B']],
      [1, ['A']],
      [3, ['C']],
    ]);
  });

  it('regroupe les ex aequo sur la même marche et saute les places qu’ils occupent', () => {
    const steps = podiumSteps([row('A', 1, '1='), row('B', 1, '1='), row('C', 3), row('D', 4)]);

    expect(steps.map((step) => [step.place, step.rankLabel, step.ids])).toEqual([
      [1, '1=', ['A', 'B']],
      [3, '3', ['C']],
    ]);
  });

  it('n’a qu’une marche quand tout le monde est premier ex aequo', () => {
    const steps = podiumSteps([row('A', 1, '1='), row('B', 1, '1='), row('C', 1, '1=')]);

    expect(steps).toHaveLength(1);
    expect(steps[0].ids).toEqual(['A', 'B', 'C']);
  });

  it('est vide sans classement', () => {
    expect(podiumSteps([])).toEqual([]);
  });
});

describe('rowsBelowPodium', () => {
  it('garde les lignes classées après la 3e place', () => {
    const rows = [row('A', 1, '1='), row('B', 1, '1='), row('C', 3), row('D', 4), row('E', 5)];

    expect(rowsBelowPodium(rows).map((entry) => entry.id)).toEqual(['D', 'E']);
  });
});

describe('sections du classement', () => {
  it('nomme le tableau de chaque équipe d’un tournoi structuré', () => {
    const table = toTournamentLeaderboard(
      [team(1, 'A', { section: MatchGroupKey.PRINCIPALE }), team(2, 'B', { section: 'pools' })],
      'victory_ga',
    );

    expect(table.rows.map((entry) => entry.section)).toEqual([
      'Tableau principal',
      'Éliminés en poules',
    ]);
  });

  it('n’a pas de section pour un classement unique', () => {
    expect(toTournamentLeaderboard([team(1, 'A')], 'victory_ga').rows[0].section).toBeNull();
  });

  it('insère un intertitre avant chaque nouvelle section, sous le podium', () => {
    const rows = [
      row('A', 1, '1', 'Principal'),
      row('B', 2, '2', 'Principal'),
      row('C', 3, '3', 'Principal'),
      row('D', 4, '4', 'Principal'),
      row('E', 5, '5', 'Consolante'),
    ];

    expect(labels(leaderboardItems(rows, true))).toEqual(['# Principal', 'D', '# Consolante', 'E']);
    expect(labels(leaderboardItems(rows, false))[0]).toBe('# Principal');
  });

  it('n’ajoute aucun intertitre sans section', () => {
    expect(labels(leaderboardItems([row('A', 1), row('B', 2)], false))).toEqual(['A', 'B']);
  });

  it('répète l’intertitre en haut d’une page ou d’une colonne qui commence en pleine section', () => {
    const items = leaderboardItems(
      [
        row('A', 1, '1', 'Principal'),
        row('B', 2, '2', 'Principal'),
        row('C', 3, '3', 'Principal'),
        row('D', 4, '4', 'Consolante'),
      ],
      false,
    );

    const page = itemTables(items, 2, 3, 1);
    expect(page.map(labels)).toEqual([['# Principal', 'B', 'C', '# Consolante']]);

    const columns = itemTables(items, 0, null, 2);
    expect(columns.map(labels)).toEqual([
      ['# Principal', 'A', 'B'],
      ['# Principal', 'C', '# Consolante', 'D'],
    ]);
  });
});

describe('pageRankLabel', () => {
  const items = leaderboardItems(
    [row('A', 1), row('B', 2), row('C', 3), row('D', 4), row('E', 5)],
    false,
  );

  it('names the ranks of the page shown', () => {
    expect(pageRankLabel(items, 0, 3)).toBe('Rangs 1 – 3');
    expect(pageRankLabel(items, 3, 3)).toBe('Rangs 4 – 5');
  });

  it('says nothing for an empty page', () => {
    expect(pageRankLabel(items, 10, 3)).toBeNull();
  });
});
