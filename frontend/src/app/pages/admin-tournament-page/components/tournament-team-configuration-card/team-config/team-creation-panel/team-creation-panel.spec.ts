import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TeamConfigEvent, TeamConfigEventType } from 'src/app/models/team-config.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { TounamentTeamDto, TournamentDto } from 'src/app/store/tournament/tournament.models';
import { TeamForm } from '../team-form/team-form';
import { TeamCreationPanel, TeamCreationPanelData } from './team-creation-panel';

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
      scoreCalculation: 'victory_goal_average',
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

const ALPHA: TounamentTeamDto = { id: 'team-1', code: '1111', name: 'Alpha', players: [] };

const CREATE_EVENT: TeamConfigEvent = {
  type: TeamConfigEventType.CREATE_TEAM,
  payload: { name: 'Bravo', players: [{ name: 'Bob' }] },
};

const UPDATE_EVENT: TeamConfigEvent = {
  type: TeamConfigEventType.UPDATE_TEAM,
  payload: { teamId: 'team-1', name: 'Alpha bis', players: [{ name: 'Al' }] },
};

function renderInline(tournament: TournamentDto) {
  const fixture = TestBed.createComponent(TeamCreationPanel);
  fixture.componentRef.setInput('tournament', tournament);
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

function renderSheet(data: TeamCreationPanelData) {
  const close = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      { provide: DIALOG_DATA, useValue: data },
      { provide: DialogRef, useValue: { close } },
    ],
  });
  const fixture = TestBed.createComponent(TeamCreationPanel);
  fixture.componentRef.setInput('tournament', data.tournament);
  fixture.detectChanges();
  const emitted: TeamConfigEvent[] = [];
  fixture.componentInstance.teamUpdated.subscribe((event) => emitted.push(event));
  const submitFromForm = (event: TeamConfigEvent) => {
    fixture.debugElement.query(By.directive(TeamForm)).componentInstance.submitted.emit(event);
    fixture.detectChanges();
  };
  return { fixture, root: fixture.nativeElement as HTMLElement, close, emitted, submitFromForm };
}

describe('TeamCreationPanel', () => {
  it('renders no tabs', () => {
    const { root } = renderInline(buildTournament([]));
    expect(root.querySelector('.creation-tabs')).toBeNull();
    expect(root.querySelector('[role="tablist"]')).toBeNull();
    expect(root.textContent).not.toContain('Import Excel');
    expect(root.querySelector('app-team-form')).not.toBeNull();
  });

  it('shows the import link in create mode and emits importRequested', () => {
    const { fixture, root } = renderInline(buildTournament([]));
    const requested = vi.fn();
    fixture.componentInstance.importRequested.subscribe(requested);
    const link = root.querySelector('.import-link .button') as HTMLElement;
    expect(link.textContent).toContain("Beaucoup d'équipes ? Importer depuis Excel");
    link.click();
    expect(requested).toHaveBeenCalledTimes(1);
  });

  it('hides the import link in championship', () => {
    const { root } = renderInline(buildTournament([], { competitionMode: 'championship' }));
    expect(root.querySelector('.import-link')).toBeNull();
    expect(root.textContent).not.toContain('Importer depuis Excel');
  });

  it('hides the import link once the tournament has started', () => {
    const { root } = renderInline({ ...buildTournament([]), status: TournamentStatus.ACTIVE });
    expect(root.querySelector('.import-link')).toBeNull();
  });

  it('emits on desktop without any dialog', () => {
    const { fixture } = renderInline(buildTournament([]));
    const emitted: TeamConfigEvent[] = [];
    fixture.componentInstance.teamUpdated.subscribe((event) => emitted.push(event));
    fixture.debugElement
      .query(By.directive(TeamForm))
      .componentInstance.submitted.emit(CREATE_EVENT);
    expect(emitted).toEqual([CREATE_EVENT]);
    expect(fixture.componentInstance.isSheet).toBe(false);
  });

  it('in sheet mode a creation emits and keeps the sheet open', () => {
    const { fixture, close, emitted, submitFromForm, root } = renderSheet({
      tournament: buildTournament([ALPHA]),
    });
    expect(fixture.componentInstance.isSheet).toBe(true);
    submitFromForm(CREATE_EVENT);
    expect(emitted).toEqual([CREATE_EVENT]);
    expect(close).not.toHaveBeenCalled();
    expect(root.querySelector('app-team-form')).not.toBeNull();
  });

  it('an edit closes the sheet with the event', () => {
    const { close, emitted, submitFromForm } = renderSheet({
      tournament: buildTournament([ALPHA]),
      editingTeam: { teamId: 'team-1', name: 'Alpha', players: [] },
    });
    submitFromForm(UPDATE_EVENT);
    expect(close).toHaveBeenCalledWith(UPDATE_EVENT);
    expect(emitted).toEqual([]);
  });

  it('shows the created-team banner with its code once the live tournament contains it', () => {
    const { fixture, root, submitFromForm } = renderSheet({
      tournament: buildTournament([ALPHA]),
    });
    expect(root.querySelector('.created-banner')).toBeNull();

    submitFromForm(CREATE_EVENT);
    expect(root.querySelector('.created-banner')).toBeNull();

    fixture.componentRef.setInput(
      'tournament',
      buildTournament([ALPHA, { id: 'team-2', code: '2222', name: 'Bravo', players: [] }]),
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.lastCreated()).toEqual({ name: 'Bravo', code: '2222' });
    expect(
      root.querySelector('.created-banner-text')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe('Bravo créée · 2222');
  });

  it('shows no banner before the live tournament contains the created team', () => {
    const { fixture, root, submitFromForm } = renderSheet({ tournament: buildTournament([ALPHA]) });
    submitFromForm(CREATE_EVENT);
    expect(fixture.componentInstance.lastCreated()).toBeNull();
    expect(root.textContent).not.toContain('créée');
  });

  it('shows no « créée » banner when the creation fails (the team never arrives)', () => {
    const { fixture, root, submitFromForm } = renderSheet({ tournament: buildTournament([ALPHA]) });
    submitFromForm(CREATE_EVENT);
    // An unrelated refresh (e.g. an error round-trip) that does not contain the team.
    fixture.componentRef.setInput('tournament', buildTournament([ALPHA]));
    fixture.detectChanges();
    expect(fixture.componentInstance.lastCreated()).toBeNull();
    expect(root.querySelector('.created-banner')).toBeNull();
  });

  it('shows the matched team when two new teams appear', () => {
    const { fixture, root, submitFromForm } = renderSheet({ tournament: buildTournament([ALPHA]) });
    submitFromForm(CREATE_EVENT);
    fixture.componentRef.setInput(
      'tournament',
      buildTournament([
        ALPHA,
        { id: 'team-x', code: '9999', name: 'Concurrent', players: [] },
        { id: 'team-2', code: '2222', name: 'Bravo', players: [] },
      ]),
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.lastCreated()).toEqual({ name: 'Bravo', code: '2222' });
    expect(
      root.querySelector('.created-banner-text')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe('Bravo créée · 2222');
  });

  it('shows the auto-named team for a players-only creation', () => {
    const { fixture, submitFromForm } = renderSheet({ tournament: buildTournament([ALPHA]) });
    submitFromForm({
      type: TeamConfigEventType.CREATE_TEAM,
      payload: { players: [{ name: 'Bob' }] },
    });
    fixture.componentRef.setInput(
      'tournament',
      buildTournament([
        ALPHA,
        { id: 'team-x', code: '9999', name: 'Concurrent', players: [] },
        { id: 'team-2', code: '2222', name: 'Équipe 2', players: [] },
      ]),
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.lastCreated()).toEqual({ name: 'Équipe 2', code: '2222' });
  });

  it('a new submit replaces the previous banner', () => {
    const { fixture, root, submitFromForm } = renderSheet({ tournament: buildTournament([ALPHA]) });
    const bravo = { id: 'team-2', code: '2222', name: 'Bravo', players: [] };
    submitFromForm(CREATE_EVENT);
    fixture.componentRef.setInput('tournament', buildTournament([ALPHA, bravo]));
    fixture.detectChanges();
    expect(fixture.componentInstance.lastCreated()?.name).toBe('Bravo');

    submitFromForm({
      type: TeamConfigEventType.CREATE_TEAM,
      payload: { name: 'Charlie', players: [{ name: 'Cy' }] },
    });
    expect(fixture.componentInstance.lastCreated()).toBeNull();
    expect(root.querySelector('.created-banner')).toBeNull();

    fixture.componentRef.setInput(
      'tournament',
      buildTournament([ALPHA, bravo, { id: 'team-3', code: '3333', name: 'Charlie', players: [] }]),
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.lastCreated()).toEqual({ name: 'Charlie', code: '3333' });
  });

  it('shows the max-capacity message once the live tournament is full', () => {
    const { fixture, root } = renderSheet({
      tournament: buildTournament([ALPHA], { maxTeamCapacity: 2, competitionMode: 'up_down' }),
    });
    expect(root.querySelector('app-team-form')).not.toBeNull();

    fixture.componentRef.setInput(
      'tournament',
      buildTournament([ALPHA, { id: 'team-2', code: '2222', name: 'Bravo', players: [] }], {
        maxTeamCapacity: 2,
        competitionMode: 'up_down',
      }),
    );
    fixture.detectChanges();
    expect(root.querySelector('app-team-form')).toBeNull();
    expect(root.textContent).toContain("Nombre d'équipe maximum atteinte");
    expect(root.querySelector('.import-link')).toBeNull();
  });

  // The capacity of a structured tournament is only a target: teams can still register above it.
  it('keeps the form above the target of a structured tournament', () => {
    const { root } = renderSheet({
      tournament: buildTournament(
        [ALPHA, { id: 'team-2', code: '2222', name: 'Bravo', players: [] }],
        { maxTeamCapacity: 2 },
      ),
    });

    expect(root.querySelector('app-team-form')).not.toBeNull();
  });

  it('closes the sheet from the « Terminer » button', () => {
    const { root, close } = renderSheet({ tournament: buildTournament([]) });
    const finish = Array.from(root.querySelectorAll('app-button .button')).find((button) =>
      button.textContent?.includes('Terminer'),
    ) as HTMLElement;
    finish.click();
    expect(close).toHaveBeenCalledWith(undefined);
  });
});
