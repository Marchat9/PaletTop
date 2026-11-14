import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { TeamConfigEvent, TeamConfigEventType } from 'src/app/models/team-config.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { TounamentTeamDto, TournamentDto } from 'src/app/store/tournament/tournament.models';
import { TeamConfig } from './team-config';
import { TeamImportWizard, TeamImportWizardResult } from './team-import-wizard/team-import-wizard';

function buildTournament(
  teams: TounamentTeamDto[],
  overrides: { maxTeamCapacity?: number; competitionMode?: string } = {},
): TournamentDto {
  return {
    id: 't1',
    code: 'ABCD',
    name: 'Tournoi Test',
    date: new Date(),
    configuration: {
      maxTeamCapacity: overrides.maxTeamCapacity ?? 16,
      scoreCalculation: 'victory_ga',
      pointsPerGame: 1,
      rematch: false,
      matchAgainstFullSameClub: false,
      matchAgainstPartialSameClub: false,
      competitionMode: overrides.competitionMode ?? 'standard',
      competitionConfiguration:
        overrides.competitionMode === 'championship' ? { homeClub: 'Home', awayClub: 'Away' } : {},
    },
    status: TournamentStatus.DRAFT,
    teams,
    createdAt: new Date().toISOString(),
    tournamentStatus: null,
  } as unknown as TournamentDto;
}

function render(tournament: TournamentDto, wizardResult: TeamImportWizardResult = undefined) {
  const open = vi.fn<(...args: unknown[]) => unknown>(() => ({ closed: of(wizardResult) }));
  TestBed.configureTestingModule({ providers: [{ provide: Dialog, useValue: { open } }] });
  const fixture = TestBed.createComponent(TeamConfig);
  fixture.componentRef.setInput('tournament', tournament);
  fixture.detectChanges();
  const emitted: TeamConfigEvent[] = [];
  fixture.componentInstance.teamUpdated.subscribe((event) => emitted.push(event));
  const root = fixture.nativeElement as HTMLElement;
  const buttonWithText = (text: string) =>
    Array.from(root.querySelectorAll('.team-config-empty-state app-button .button')).find(
      (button) => button.textContent?.includes(text),
    ) as HTMLElement | undefined;
  return { fixture, component: fixture.componentInstance, root, open, emitted, buttonWithText };
}

describe('TeamConfig', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('shows the two empty-state choices with 0 teams', () => {
    const { buttonWithText } = render(buildTournament([]));
    expect(buttonWithText('Saisir les équipes une par une')).toBeDefined();
    expect(buttonWithText('Importer une liste depuis Excel')).toBeDefined();
  });

  it('shows no empty-state choice once a team exists', () => {
    const { root } = render(buildTournament([{ id: 'a', name: 'Alpha', players: [] }]));
    expect(root.querySelector('.team-config-empty-state')).toBeNull();
  });

  it('hides the import choice in championship', () => {
    const { buttonWithText } = render(buildTournament([], { competitionMode: 'championship' }));
    expect(buttonWithText('Saisir les équipes une par une')).toBeDefined();
    expect(buttonWithText('Importer une liste depuis Excel')).toBeUndefined();
  });

  it('hides the import choice and refuses the wizard once the tournament has started', () => {
    const { component, open, buttonWithText } = render({
      ...buildTournament([]),
      status: TournamentStatus.ACTIVE,
    });
    expect(buttonWithText('Importer une liste depuis Excel')).toBeUndefined();
    expect(component.canImport()).toBe(false);
    component.openImportWizard();
    expect(open).not.toHaveBeenCalled();
  });

  it('emits IMPORT_TEAMS with ignoredRows from the wizard result', () => {
    const teams = [{ name: 'Alpha', players: [{ name: 'Al' }] }];
    const { open, emitted, buttonWithText } = render(buildTournament([]), {
      teams,
      ignoredRows: 3,
    });
    buttonWithText('Importer une liste depuis Excel')!.click();

    expect(open).toHaveBeenCalledWith(
      TeamImportWizard,
      expect.objectContaining({
        data: { existingTeamCount: 0, maxTeamCapacity: 16 },
        panelClass: 'team-import-wizard-panel',
        backdropClass: 'dialog-backdrop-light',
      }),
    );
    expect(emitted).toEqual([
      { type: TeamConfigEventType.IMPORT_TEAMS, payload: teams, ignoredRows: 3 },
    ]);
  });

  it('emits nothing when the wizard is cancelled', () => {
    const { component, open, emitted } = render(buildTournament([]));
    component.openImportWizard();
    expect(open).toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it('does not open the wizard when full', () => {
    const { component, open } = render(
      buildTournament(
        [
          { id: 'a', name: 'Alpha', players: [] },
          { id: 'b', name: 'Bravo', players: [] },
        ],
        { maxTeamCapacity: 2 },
      ),
    );
    expect(component.canImport()).toBe(false);
    component.openImportWizard();
    expect(open).not.toHaveBeenCalled();
  });

  it('opens the wizard from the creation panel import link', () => {
    const { root, open } = render(buildTournament([]));
    (root.querySelector('app-team-creation-panel .import-link .button') as HTMLElement).click();
    expect(open).toHaveBeenCalledWith(TeamImportWizard, expect.anything());
  });

  it('wires the mobile sheet: live tournament, creations re-emitted, import closes then opens the wizard', () => {
    const closed = new Subject<TeamConfigEvent | undefined>();
    const sheetRef = {
      componentInstance: {
        clubSearchRequested: new Subject<string>(),
        teamUpdated: new Subject<TeamConfigEvent>(),
        importRequested: new Subject<void>(),
      },
      componentRef: { setInput: vi.fn() },
      closed,
      close: vi.fn(() => closed.next(undefined)),
    };
    const { fixture, component, open, emitted } = render(buildTournament([]));
    open.mockImplementationOnce(() => sheetRef);

    component.openCreationSheet();
    fixture.detectChanges();
    expect(sheetRef.componentRef.setInput).toHaveBeenCalledWith(
      'tournament',
      expect.objectContaining({ code: 'ABCD' }),
    );

    const live = buildTournament([{ id: 'a', code: '1234', name: 'Alpha', players: [] }]);
    fixture.componentRef.setInput('tournament', live);
    fixture.detectChanges();
    expect(sheetRef.componentRef.setInput).toHaveBeenLastCalledWith('tournament', live);

    const create: TeamConfigEvent = {
      type: TeamConfigEventType.CREATE_TEAM,
      payload: { name: 'Bravo', players: [] },
    };
    sheetRef.componentInstance.teamUpdated.next(create);
    expect(emitted).toEqual([create]);
    expect(sheetRef.close).not.toHaveBeenCalled();

    sheetRef.componentInstance.importRequested.next();
    expect(sheetRef.close).toHaveBeenCalled();
    expect(open).toHaveBeenLastCalledWith(TeamImportWizard, expect.anything());
  });

  it('highlights the creation panel briefly on desktop', () => {
    vi.useFakeTimers();
    // jsdom has no scrollIntoView.
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: scrollIntoView,
      configurable: true,
    });
    const { fixture, component, root } = render(buildTournament([]));
    component.startTeamCreation();
    expect(scrollIntoView).toHaveBeenCalled();
    fixture.detectChanges();
    expect(component.highlightCreation()).toBe(true);
    expect(root.querySelector('.creation-column.highlighted')).not.toBeNull();
    vi.advanceTimersByTime(1600);
    expect(component.highlightCreation()).toBe(false);
  });
});
