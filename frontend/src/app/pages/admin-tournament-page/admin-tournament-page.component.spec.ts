import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { DEFAULT_SCORE_CALCULATIONS_BY_MODE } from 'src/app/models/app-setting.model';
import { selectScoreCalculationsByMode } from 'src/app/store/app-settings/app-settings.selectors';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TeamConfigEventType } from 'src/app/models/team-config.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { resyncRequested } from 'src/app/store/realtime/realtime.actions';
import { selectAdminUpdateScoreLoading } from 'src/app/store/match/match.selectors';
import { selectRanking, selectRankingIsLoading } from 'src/app/store/ranking/ranking.selectors';
import { selectSessions } from 'src/app/store/session/session.selectors';
import {
  connectTournamentAdministrator,
  updateTournamentAdministratorTeam,
} from 'src/app/store/tournament/tournament.admin.actions';
import {
  selectCompleteTournamentLoading,
  selectCurrentTournamentAdminInformations,
  selectCurrentTournamentData,
  selectCurrentTournamentIsAdminView,
  selectCurrentTournamentIsLoading,
  selectNextSessionLoading,
  selectStartTournamentLoading,
  selectTournamentUpdateConfigLoading,
} from 'src/app/store/tournament/tournament.selectors';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import {
  clearTournamentClubSuggestions,
  searchTournamentClubs,
} from 'src/app/store/tournament-club/tournament-club.actions';
import { selectTournamentClubSuggestions } from 'src/app/store/tournament-club/tournament-club.selectors';
import { AdminTournamentPageComponent } from './admin-tournament-page.component';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { MatchesSessionDto, SessionStatus } from 'src/app/models/matches-session.model';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfExportService } from 'src/app/services/pdf-export.service';
import { TournamentTeamConfigurationCard } from './components/tournament-team-configuration-card/tournament-team-configuration-card';

function buildTournament(status = TournamentStatus.ACTIVE): TournamentDto {
  return {
    id: 't1',
    code: 'ABCD',
    name: 'Tournoi Test',
    date: new Date(),
    configuration: {
      maxTeamCapacity: 16,
      scoreCalculation: 'victory_ga',
      pointsPerGame: 1,
      rematch: false,
      matchAgainstFullSameClub: false,
      matchAgainstPartialSameClub: false,
      competitionMode: 'standard',
      competitionConfiguration: {},
    },
    status,
    teams: [],
    createdAt: new Date().toISOString(),
    tournamentStatus: null,
  };
}

const FINAL_RANKING: GlobalRankingEntry[] = [
  {
    rank: 1,
    teamId: 'team-1',
    teamName: 'Alpha',
    wins: 3,
    pointsFor: 39,
    pointsAgainst: 12,
    goalAverage: 27,
    matchesPlayed: 3,
    tournamentPoints: 9,
  },
];

interface SetupOptions {
  isAdminView?: boolean;
  status?: TournamentStatus;
  ranking?: GlobalRankingEntry[];
  sessions?: MatchesSessionDto[];
  pdfDownload?: () => Promise<void>;
  paramMap?: Observable<ParamMap>;
}

function setup({
  isAdminView = true,
  status = TournamentStatus.ACTIVE,
  ranking = [],
  sessions = [],
  pdfDownload = () => Promise.resolve(),
  paramMap = of(convertToParamMap({ tournamentCode: 'ABCD' })),
}: SetupOptions = {}) {
  const activatedRoute = { paramMap } as unknown as ActivatedRoute;
  const routerMock = { navigate: vi.fn() };
  const dialogMock = { open: vi.fn() };
  const actions$ = new Subject<Action>();
  const pdfExport = {
    download: vi.fn((_document: TDocumentDefinitions, _fileName: string) => pdfDownload()),
  };

  TestBed.configureTestingModule({
    imports: [AdminTournamentPageComponent],
    providers: [
      { provide: ActivatedRoute, useValue: activatedRoute },
      { provide: Router, useValue: routerMock },
      { provide: Dialog, useValue: dialogMock },
      { provide: Actions, useValue: actions$ },
      { provide: PdfExportService, useValue: pdfExport },
      provideMockStore({
        selectors: [
          { selector: selectScoreCalculationsByMode, value: DEFAULT_SCORE_CALCULATIONS_BY_MODE },
          { selector: selectCurrentTournamentData, value: buildTournament(status) },
          {
            selector: selectCurrentTournamentAdminInformations,
            value: { code: 'ABCD', password: 'secret' },
          },
          { selector: selectCurrentTournamentIsLoading, value: false },
          { selector: selectCurrentTournamentIsAdminView, value: isAdminView },
          { selector: selectCompleteTournamentLoading, value: false },
          { selector: selectTournamentUpdateConfigLoading, value: false },
          { selector: selectStartTournamentLoading, value: false },
          { selector: selectNextSessionLoading, value: false },
          { selector: selectAdminUpdateScoreLoading, value: false },
          { selector: selectRankingIsLoading, value: false },
          { selector: selectSessions, value: sessions },
          { selector: selectRanking, value: ranking },
          { selector: selectTournamentClubSuggestions, value: [] },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(AdminTournamentPageComponent);
  const store = TestBed.inject(MockStore);
  return { fixture, store, actions$, pdfExport };
}

// The first render of this large page takes about 1 s alone, but went past the default 5 s when
// the whole suite runs in parallel.
describe('AdminTournamentPageComponent', { timeout: 15_000 }, () => {
  it('re-fetches the tournament as admin when a resync is requested', () => {
    const { fixture, store, actions$ } = setup();
    fixture.detectChanges();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    actions$.next(resyncRequested());

    expect(dispatchSpy).toHaveBeenCalledWith(
      connectTournamentAdministrator({ code: 'ABCD', password: 'secret' }),
    );
  });

  it('does not reconnect when the admin view of this tournament is already loaded', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.detectChanges();

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      connectTournamentAdministrator({ code: 'ABCD', password: 'secret' }),
    );
  });

  // Admin who also plays: the player view of the same tournament only has their own team code.
  it('fetches the admin view when only the player view of this tournament is loaded', () => {
    const { fixture, store } = setup({ isAdminView: false });
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(
      connectTournamentAdministrator({ code: 'ABCD', password: 'secret' }),
    );
  });

  it('offers the ranking PDF only once the tournament is finished and ranked', () => {
    expect(setup({ ranking: FINAL_RANKING }).fixture.componentInstance.canDownloadRanking()).toBe(
      false,
    );
    TestBed.resetTestingModule();
    expect(
      setup({ status: TournamentStatus.FINISHED }).fixture.componentInstance.canDownloadRanking(),
    ).toBe(false);
    TestBed.resetTestingModule();
    expect(
      setup({
        status: TournamentStatus.FINISHED,
        ranking: FINAL_RANKING,
      }).fixture.componentInstance.canDownloadRanking(),
    ).toBe(true);
  });

  it('downloads the final ranking PDF named after the tournament', async () => {
    const { fixture, pdfExport } = setup({
      status: TournamentStatus.FINISHED,
      ranking: FINAL_RANKING,
    });

    await fixture.componentInstance.downloadRanking();

    expect(pdfExport.download).toHaveBeenCalledTimes(1);
    expect(pdfExport.download.mock.calls[0][1]).toBe('classement-tournoi-test.pdf');
    expect(fixture.componentInstance.isRankingExporting()).toBe(false);
  });

  it('notifies the admin when the ranking PDF cannot be generated', async () => {
    const { fixture, store } = setup({
      status: TournamentStatus.FINISHED,
      ranking: FINAL_RANKING,
      pdfDownload: () => Promise.reject(new Error('chunk load failed')),
    });
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    await fixture.componentInstance.downloadRanking();

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: expect.objectContaining({
          message: "Le classement n'a pas pu être généré. Réessayez.",
        }),
      }),
    );
  });

  it('dispatches searchTournamentClubs with the tournament code', () => {
    const { fixture, store } = setup();
    fixture.detectChanges();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.searchClubs('Pal');

    expect(dispatchSpy).toHaveBeenCalledWith(
      searchTournamentClubs({ code: 'ABCD', search: 'Pal' }),
    );
  });

  it('passes the import summary on IMPORT_TEAMS', () => {
    const { fixture, store } = setup();
    fixture.detectChanges();
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const teams = [{ players: [{ name: 'A' }] }, { players: [{ name: 'B' }] }];

    fixture.componentInstance.updateTournamentTeam({
      type: TeamConfigEventType.IMPORT_TEAMS,
      payload: teams,
      ignoredRows: 3,
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      updateTournamentAdministratorTeam({
        code: 'ABCD',
        teams,
        importSummary: { importedCount: 2, ignoredCount: 3 },
      }),
    );
  });

  it('opens the wizard through the card', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const card = fixture.debugElement.query(By.directive(TournamentTeamConfigurationCard))
      .componentInstance as TournamentTeamConfigurationCard;
    const importSpy = vi.spyOn(card, 'startTeamImport').mockImplementation(() => {});

    fixture.componentInstance.importTeams();

    expect(importSpy).toHaveBeenCalledTimes(1);
  });

  it('clears the club suggestions when the tournament code changes', () => {
    const paramMap = new BehaviorSubject(convertToParamMap({ tournamentCode: 'ABCD' }));
    const { fixture, store } = setup({ paramMap });
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();
    expect(dispatchSpy).toHaveBeenCalledWith(clearTournamentClubSuggestions());

    dispatchSpy.mockClear();
    paramMap.next(convertToParamMap({ tournamentCode: 'abcd' }));
    expect(dispatchSpy).not.toHaveBeenCalledWith(clearTournamentClubSuggestions());

    paramMap.next(convertToParamMap({ tournamentCode: 'WXYZ' }));
    expect(dispatchSpy).toHaveBeenCalledWith(clearTournamentClubSuggestions());
  });

  it('clears the club suggestions when the page is left (disconnect, other page)', () => {
    const { fixture, store } = setup();
    fixture.detectChanges();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.destroy();

    expect(dispatchSpy).toHaveBeenCalledWith(clearTournamentClubSuggestions());
  });

  it('offers the PDF of every match only once the tournament is finished', () => {
    const played: MatchesSessionDto[] = [
      { id: 's1', sessionNumber: 1, status: SessionStatus.CLOSED, isDrawnRound: true, matches: [] },
    ];

    expect(setup({ sessions: played }).fixture.componentInstance.canDownloadMatches()).toBe(false);
    TestBed.resetTestingModule();
    expect(
      setup({
        status: TournamentStatus.FINISHED,
        sessions: played,
      }).fixture.componentInstance.canDownloadMatches(),
    ).toBe(true);
  });

  it('downloads every match as a PDF named after the tournament', async () => {
    const { fixture, pdfExport } = setup({
      status: TournamentStatus.FINISHED,
      sessions: [
        {
          id: 's1',
          sessionNumber: 1,
          status: SessionStatus.CLOSED,
          isDrawnRound: true,
          matches: [],
        },
      ],
    });

    await fixture.componentInstance.downloadMatches();

    expect(pdfExport.download).toHaveBeenCalledTimes(1);
    expect(pdfExport.download.mock.calls[0][1]).toBe('matchs-tournoi-test.pdf');
    expect(fixture.componentInstance.isMatchesExporting()).toBe(false);
  });
});
