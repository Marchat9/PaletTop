import { Dialog } from '@angular/cdk/dialog';
import { previewLaunchPlan } from 'src/app/store/tournament-plan/tournament-plan.actions';
import {
  selectLaunchPlan,
  selectLaunchPlanLoading,
} from 'src/app/store/tournament-plan/tournament-plan.selectors';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
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
  selectStartTournamentTeamCountChanged,
} from 'src/app/store/tournament/tournament.selectors';
import { TournamentDto, TounamentTeamDto } from 'src/app/store/tournament/tournament.models';
import { nextSession, startTournament } from 'src/app/store/tournament/tournament.match.actions';
import { selectLocalStorageData } from 'src/app/store/app-config/app-config.selectors';
import {
  removeLocalStorageData,
  setLocalStorageData,
} from 'src/app/store/app-config/app-config.actions';
import {
  ROUND_CONFIRMATION_SKIP_TTL_MS,
  skipRoundConfirmationKey,
} from 'src/app/store/app-config/round-confirmation';
import {
  EDIT_CONFIGURATION,
  LaunchCheckPopup,
} from 'src/app/modales/launch-check-popup/launch-check-popup';
import { StartSummaryPopup } from 'src/app/modales/start-summary-popup/start-summary-popup';
import { ConfirmationPopupComponent } from 'src/app/modales/confirmation-popup/confirmation-popup';
import { TournamentPlan } from 'src/app/models/tournament-plan.model';
import { exactCountPlan, fewerTeamsPlan, impossiblePlan } from 'src/app/utils/launch-plan.fixtures';
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
import { TournamentParcours } from 'src/app/shared/tournament-parcours/tournament-parcours';
import { TournamentTeamConfigurationCard } from './components/tournament-team-configuration-card/tournament-team-configuration-card';
import { DonationCard } from './components/donation-card/donation-card';
import { CurrentRoundCard } from 'src/app/shared/current-round-card/current-round-card';

function buildTeams(count: number): TounamentTeamDto[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `team-${index}`,
    name: `Equipe ${index}`,
    players: [],
  }));
}

function buildTournament(status = TournamentStatus.ACTIVE, teamCount = 0): TournamentDto {
  return {
    id: 't1',
    code: 'ABCD',
    name: 'Tournoi Test',
    date: new Date(),
    configuration: {
      maxTeamCapacity: 16,
      scoreCalculation: 'victory_goal_average',
      pointsPerGame: 1,
      rematch: false,
      matchAgainstFullSameClub: false,
      matchAgainstPartialSameClub: false,
      competitionMode: 'standard',
      competitionConfiguration: {},
    },
    status,
    teams: buildTeams(teamCount),
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
    losses: 0,
  },
];

interface SetupOptions {
  isAdminView?: boolean;
  status?: TournamentStatus;
  ranking?: GlobalRankingEntry[];
  sessions?: MatchesSessionDto[];
  pdfDownload?: () => Promise<void>;
  paramMap?: Observable<ParamMap>;
  tournament?: TournamentDto;
  localStorageData?: Record<string, unknown>;
  nextLoading?: boolean;
}

function setup({
  isAdminView = true,
  status = TournamentStatus.ACTIVE,
  ranking = [],
  sessions = [],
  pdfDownload = () => Promise.resolve(),
  paramMap = of(convertToParamMap({ tournamentCode: 'ABCD' })),
  tournament = buildTournament(status),
  localStorageData = {},
  nextLoading = false,
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
          { selector: selectLaunchPlan, value: null },
          { selector: selectLaunchPlanLoading, value: false },
          { selector: selectStartTournamentTeamCountChanged, value: false },
          { selector: selectCurrentTournamentData, value: tournament },
          {
            selector: selectCurrentTournamentAdminInformations,
            value: { code: 'ABCD', password: 'secret' },
          },
          { selector: selectCurrentTournamentIsLoading, value: false },
          { selector: selectCurrentTournamentIsAdminView, value: isAdminView },
          { selector: selectCompleteTournamentLoading, value: false },
          { selector: selectStartTournamentLoading, value: false },
          { selector: selectNextSessionLoading, value: nextLoading },
          { selector: selectLocalStorageData, value: localStorageData },
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
  return { fixture, store, actions$, pdfExport, dialogMock, routerMock };
}

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

  describe('configuration page', () => {
    it('opens the configuration of the tournament on its own page', () => {
      const { fixture, routerMock } = setup();
      fixture.detectChanges();

      fixture.componentInstance.openConfiguration();

      expect(routerMock.navigate).toHaveBeenCalledWith(
        ['/admin/tournament', 'ABCD', 'configuration'],
        { queryParams: {} },
      );
    });

    it('opens it from the button of the header', () => {
      const { fixture, routerMock } = setup();
      fixture.detectChanges();

      const button = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('app-tournament-header .button'),
      ).find((candidate) => candidate.textContent?.includes('Configuration')) as HTMLElement;
      button.click();

      expect(routerMock.navigate).toHaveBeenCalledWith(
        ['/admin/tournament', 'ABCD', 'configuration'],
        { queryParams: {} },
      );
    });
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

  describe('next round', () => {
    const open = (sessionNumber: number): MatchesSessionDto => ({
      id: `s${sessionNumber}`,
      sessionNumber,
      status: SessionStatus.OPEN,
      isDrawnRound: true,
      matches: [],
    });

    it('asks for confirmation before starting the next round', () => {
      const { fixture, store, dialogMock } = setup({ sessions: [open(3)] });
      dialogMock.open.mockReturnValue({ closed: of(true) });
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      fixture.componentInstance.nextSession();

      expect(dialogMock.open.mock.calls[0][0]).toBe(ConfirmationPopupComponent);
      expect(dialogMock.open.mock.calls[0][1].data.title).toBe('Lancer le round suivant ?');
      expect(dialogMock.open.mock.calls[0][1].data.message).toContain('Le round 4 ');
      expect(dispatchSpy).toHaveBeenCalledWith(nextSession());
    });

    it('does not start the round when cancelled', () => {
      const { fixture, store, dialogMock } = setup({ sessions: [open(3)] });
      dialogMock.open.mockReturnValue({ closed: of(false) });
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      fixture.componentInstance.nextSession();

      expect(dispatchSpy).not.toHaveBeenCalledWith(nextSession());
    });

    const OPT_OUT_KEY = skipRoundConfirmationKey('tournament', 'ABCD');

    it('starts the round directly once the admin chose not to be asked for this tournament', () => {
      const { fixture, store, dialogMock } = setup({
        localStorageData: { [OPT_OUT_KEY]: Date.now() },
      });
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      fixture.componentInstance.nextSession();

      expect(dialogMock.open).not.toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(nextSession());
    });

    it('asks again 24 hours after the opt-out', () => {
      const { fixture, dialogMock } = setup({
        localStorageData: { [OPT_OUT_KEY]: Date.now() - ROUND_CONFIRMATION_SKIP_TTL_MS - 1 },
      });
      dialogMock.open.mockReturnValue({ closed: of(false) });

      fixture.componentInstance.nextSession();

      expect(dialogMock.open).toHaveBeenCalledTimes(1);
    });

    it('still asks when only another tournament or a session was opted out', () => {
      const { fixture, dialogMock } = setup({
        localStorageData: {
          [skipRoundConfirmationKey('tournament', 'ZZZZ')]: Date.now(),
          [skipRoundConfirmationKey('training', 'ABCD')]: Date.now(),
        },
      });
      dialogMock.open.mockReturnValue({ closed: of(false) });

      fixture.componentInstance.nextSession();

      expect(dialogMock.open).toHaveBeenCalledTimes(1);
    });

    it('remembers the opt-out of this tournament under its own key', () => {
      const now = Date.UTC(2026, 10, 27, 12);
      vi.spyOn(Date, 'now').mockReturnValue(now);
      const { fixture, store, dialogMock } = setup();
      dialogMock.open.mockReturnValue({ closed: of(true) });
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      fixture.componentInstance.nextSession();
      dialogMock.open.mock.calls[0][1].data.onDontAskAgain();

      expect(dispatchSpy).toHaveBeenCalledWith(
        setLocalStorageData({ key: OPT_OUT_KEY, value: now }),
      );
      vi.restoreAllMocks();
    });

    it('forgets the opt-out once the tournament is finished', () => {
      const { fixture, store } = setup({
        status: TournamentStatus.FINISHED,
        localStorageData: { [OPT_OUT_KEY]: Date.now() },
      });
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      fixture.detectChanges();

      expect(dispatchSpy).toHaveBeenCalledWith(removeLocalStorageData({ key: OPT_OUT_KEY }));
    });

    it('stores nothing to forget while the tournament is active', () => {
      const { fixture, store } = setup({ localStorageData: { [OPT_OUT_KEY]: Date.now() } });
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      fixture.detectChanges();

      expect(dispatchSpy).not.toHaveBeenCalledWith(removeLocalStorageData({ key: OPT_OUT_KEY }));
    });

    it('does nothing while the next round is loading', () => {
      const { fixture, store, dialogMock } = setup({ nextLoading: true });
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      fixture.componentInstance.nextSession();

      expect(dialogMock.open).not.toHaveBeenCalled();
      expect(dispatchSpy).not.toHaveBeenCalledWith(nextSession());
    });
  });

  describe('donation', () => {
    it('shows the donation card above the finished message once the tournament is over', () => {
      const { fixture } = setup({ status: TournamentStatus.FINISHED });
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.directive(DonationCard))).not.toBeNull();
      expect(fixture.debugElement.query(By.directive(CurrentRoundCard))).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Le tournoi est terminé');
    });

    it('shows the rounds card and no donation card while the tournament is active', () => {
      const { fixture } = setup({ status: TournamentStatus.ACTIVE });
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.directive(DonationCard))).toBeNull();
      expect(fixture.debugElement.query(By.directive(CurrentRoundCard))).not.toBeNull();
    });
  });

  describe('parcours', () => {
    const closed = (sessionNumber: number): MatchesSessionDto => ({
      id: `s${sessionNumber}`,
      sessionNumber,
      status: SessionStatus.CLOSED,
      isDrawnRound: false,
      matches: [],
    });
    const parcours = (fixture: ReturnType<typeof setup>['fixture']) =>
      fixture.debugElement.query(By.directive(TournamentParcours))?.componentInstance as
        TournamentParcours | undefined;

    it('ticks the finished rounds and highlights the current one, from the sessions', () => {
      const { fixture } = setup({
        tournament: { ...buildTournament(TournamentStatus.ACTIVE), plan: exactCountPlan() },
        sessions: [closed(1), closed(2), { ...closed(3), status: SessionStatus.OPEN }],
      });
      fixture.detectChanges();

      expect(parcours(fixture)?.doneRounds()).toBe(2);
      expect(parcours(fixture)?.currentRound()).toBe(3);
      expect(parcours(fixture)?.plan()).toBe(fixture.componentInstance.tournament()?.plan);
    });

    it('shows the planned parcours of a draft, with no round played', () => {
      const { fixture } = setup({
        status: TournamentStatus.DRAFT,
        tournament: { ...buildTournament(TournamentStatus.DRAFT), plan: exactCountPlan() },
      });
      fixture.detectChanges();

      expect(parcours(fixture)?.doneRounds()).toBe(0);
      expect(parcours(fixture)?.currentRound()).toBeNull();
    });

    it('keeps every round ticked once the tournament is finished', () => {
      const { fixture } = setup({
        tournament: { ...buildTournament(TournamentStatus.FINISHED), plan: exactCountPlan() },
        sessions: [closed(1), closed(2)],
      });
      fixture.detectChanges();

      expect(parcours(fixture)?.doneRounds()).toBe(2);
      expect(parcours(fixture)?.currentRound()).toBeNull();
    });

    it('shows no parcours for a tournament without plan', () => {
      const { fixture } = setup();
      fixture.detectChanges();

      expect(parcours(fixture)).toBeUndefined();
    });
  });

  describe('launch check', () => {
    function draftWith(teamCount: number, competitionMode = 'standard'): TournamentDto {
      const tournament = buildTournament(TournamentStatus.DRAFT, teamCount);
      return {
        ...tournament,
        configuration: {
          ...tournament.configuration,
          maxTeamCapacity: 128,
          competitionMode: competitionMode as TournamentDto['configuration']['competitionMode'],
          competitionConfiguration: { consolationCount: 2 },
        },
      };
    }

    function launch(teamCount: number, plan: TournamentPlan, competitionMode = 'standard') {
      const closed$ = new Subject<unknown>();
      const context = setup({ tournament: draftWith(teamCount, competitionMode) });
      context.dialogMock.open.mockReturnValue({ closed: closed$ });
      const dispatchSpy = vi.spyOn(context.store, 'dispatch');
      context.fixture.detectChanges();

      context.fixture.componentInstance.startTournament();
      context.store.overrideSelector(selectLaunchPlan, plan);
      context.store.refreshState();
      context.fixture.detectChanges();
      return { ...context, closed$, dispatchSpy };
    }

    function dispatched(dispatchSpy: { mock: { calls: unknown[][] } }, type: string) {
      return dispatchSpy.mock.calls
        .map(([action]) => action as Action & Record<string, unknown>)
        .filter((action) => action.type === type);
    }

    it('previews the saved configuration with the teams registered right now', () => {
      const { dispatchSpy } = launch(117, fewerTeamsPlan());

      const [request] = dispatched(dispatchSpy, previewLaunchPlan.type);
      expect(request['body']).toEqual({
        competitionMode: 'standard',
        competitionConfiguration: { consolationCount: 2 },
        teamCount: 117,
        targetCount: 128,
      });
    });

    it('opens the summary when the count is the planned one, with no option to pick', () => {
      const { dialogMock } = launch(128, exactCountPlan());

      expect(dialogMock.open).toHaveBeenCalledTimes(1);
      expect(dialogMock.open.mock.calls[0][0]).toBe(StartSummaryPopup);
    });

    it('sends the admin to the brackets of the configuration page to adjust them by hand', () => {
      const { closed$, routerMock } = launch(3, impossiblePlan());

      closed$.next(EDIT_CONFIGURATION);

      expect(routerMock.navigate).toHaveBeenCalledWith(
        ['/admin/tournament', 'ABCD', 'configuration'],
        { queryParams: { section: 'mode' } },
      );
    });

    it('opens the options, never the summary, for an impossible plan', () => {
      const { dialogMock } = launch(3, impossiblePlan());

      expect(dialogMock.open).toHaveBeenCalledTimes(1);
      expect(dialogMock.open.mock.calls[0][0]).toBe(LaunchCheckPopup);
    });

    it('starts after the summary with the saved configuration and the checked count', () => {
      const { closed$, dispatchSpy } = launch(128, exactCountPlan());

      closed$.next(true);

      expect(dispatched(dispatchSpy, startTournament.type)).toEqual([
        startTournament({
          launchChoice: {
            expectedTeamCount: 128,
            consolationCount: 2,
            eliminatedAfterQualifying: 0,
          },
        }),
      ]);
    });

    it('does not start when the summary is cancelled', () => {
      const { closed$, dispatchSpy } = launch(128, exactCountPlan());

      closed$.next(false);

      expect(dispatched(dispatchSpy, startTournament.type)).toEqual([]);
    });

    it('opens the options when the count differs from the planned one', () => {
      const { dialogMock } = launch(117, fewerTeamsPlan());

      expect(dialogMock.open).toHaveBeenCalledTimes(1);
      expect(dialogMock.open.mock.calls[0][0]).toBe(LaunchCheckPopup);
      expect(dialogMock.open.mock.calls[0][1].data).toMatchObject({
        registeredCount: 117,
        targetCount: 128,
        notice: null,
      });
    });

    it('starts with the values of the chosen option', () => {
      const { closed$, dispatchSpy } = launch(117, fewerTeamsPlan());

      closed$.next('stop_last');

      expect(dispatched(dispatchSpy, startTournament.type)).toEqual([
        startTournament({
          launchChoice: {
            expectedTeamCount: 117,
            consolationCount: 2,
            eliminatedAfterQualifying: 5,
          },
        }),
      ]);
    });

    it('does not start when the options are closed without a choice', () => {
      const { closed$, dispatchSpy } = launch(117, fewerTeamsPlan());

      closed$.next(undefined);

      expect(dispatched(dispatchSpy, startTournament.type)).toEqual([]);
    });

    it('fetches the teams again, then checks again with a notice, when the count changed', () => {
      const { closed$, store, fixture, dialogMock, dispatchSpy } = launch(117, fewerTeamsPlan());
      closed$.next('keep');
      expect(dispatched(dispatchSpy, previewLaunchPlan.type)).toHaveLength(1);

      store.overrideSelector(selectStartTournamentTeamCountChanged, true);
      store.overrideSelector(selectCurrentTournamentIsLoading, true);
      store.refreshState();
      fixture.detectChanges();

      // The store does not know the new count: the tournament is fetched before any new check.
      expect(dispatchSpy).toHaveBeenCalledWith(
        connectTournamentAdministrator({ code: 'ABCD', password: 'secret' }),
      );
      expect(dispatched(dispatchSpy, previewLaunchPlan.type)).toHaveLength(1);

      store.overrideSelector(selectCurrentTournamentData, draftWith(118));
      store.overrideSelector(selectCurrentTournamentIsLoading, false);
      store.refreshState();
      fixture.detectChanges();

      const checks = dispatched(dispatchSpy, previewLaunchPlan.type);
      expect(checks).toHaveLength(2);
      expect(checks[1]['body']).toMatchObject({ teamCount: 118 });
      store.overrideSelector(selectLaunchPlan, { ...fewerTeamsPlan() });
      store.refreshState();
      fixture.detectChanges();
      expect(dialogMock.open).toHaveBeenCalledTimes(2);
      expect(dialogMock.open.mock.calls[1][1].data.notice).toContain(
        "Le nombre d'équipes a changé",
      );
      expect(dialogMock.open.mock.calls[1][1].data.registeredCount).toBe(118);
    });

    it('keeps the plain confirmation for a mode without a plan', () => {
      const closed$ = new Subject<unknown>();
      const { fixture, store, dialogMock } = setup({ tournament: draftWith(8, 'up_down') });
      dialogMock.open.mockReturnValue({ closed: closed$ });
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      fixture.detectChanges();

      fixture.componentInstance.startTournament();
      closed$.next(true);

      expect(dialogMock.open.mock.calls[0][0]).toBe(ConfirmationPopupComponent);
      expect(dispatched(dispatchSpy, previewLaunchPlan.type)).toEqual([]);
      expect(dispatched(dispatchSpy, startTournament.type)).toEqual([startTournament({})]);
    });
  });
});
