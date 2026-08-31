import { TestBed } from '@angular/core/testing';
import { TournamentTeamConfigurationCard } from './tournament-team-configuration-card';
import { Nullable } from 'src/app/models/nullable.model';
import { TounamentTeamDto, TournamentDto } from 'src/app/store/tournament/tournament.models';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';

function buildTournament(teams: TounamentTeamDto[]): TournamentDto {
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
    status: TournamentStatus.DRAFT,
    teams,
    createdAt: new Date().toISOString(),
    tournamentStatus: null,
  };
}

describe('TournamentTeamConfigurationCard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mounts the print sheet and calls window.print() when printTeamList() runs', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const fixture = TestBed.createComponent(TournamentTeamConfigurationCard);
    fixture.componentRef.setInput(
      'tournament',
      buildTournament([{ id: 'team-1', code: '1234', name: 'Alpha', players: [] }]),
    );
    fixture.detectChanges();

    fixture.componentInstance.printTeamList();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-team-print-sheet')).not.toBeNull();
    expect(printSpy).toHaveBeenCalled();
  });

  it('has the QR code svg (not the loading placeholder) in the DOM by the time window.print() fires', async () => {
    let qrCellHtmlAtPrintTime = '';
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {
      const qrCell: Nullable<HTMLElement> = fixture.nativeElement.querySelector(
        'app-team-print-sheet td:last-child',
      );
      qrCellHtmlAtPrintTime = qrCell?.innerHTML ?? '';
    });
    const fixture = TestBed.createComponent(TournamentTeamConfigurationCard);
    fixture.componentRef.setInput(
      'tournament',
      buildTournament([{ id: 'team-1', code: '1234', name: 'Alpha', players: [] }]),
    );
    fixture.detectChanges();

    fixture.componentInstance.printTeamList();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(printSpy).toHaveBeenCalled();
    expect(qrCellHtmlAtPrintTime).toContain('<svg');
    expect(qrCellHtmlAtPrintTime).not.toContain('qr-code-placeholder');
  });

  it('unmounts the print sheet when the browser fires afterprint', async () => {
    vi.spyOn(window, 'print').mockImplementation(() => {});
    const fixture = TestBed.createComponent(TournamentTeamConfigurationCard);
    fixture.componentRef.setInput(
      'tournament',
      buildTournament([{ id: 'team-1', code: '1234', name: 'Alpha', players: [] }]),
    );
    fixture.detectChanges();

    fixture.componentInstance.printTeamList();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.isPrinting()).toBe(true);

    window.dispatchEvent(new Event('afterprint'));
    fixture.detectChanges();

    expect(fixture.componentInstance.isPrinting()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-team-print-sheet')).toBeNull();
  });

  it('emits a notification when the browser never fires beforeprint (print unsupported)', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'print').mockImplementation(() => {});
    const fixture = TestBed.createComponent(TournamentTeamConfigurationCard);
    const emitSpy = vi.fn();
    fixture.componentInstance.notification.subscribe(emitSpy);
    fixture.componentRef.setInput(
      'tournament',
      buildTournament([{ id: 'team-1', code: '1234', name: 'Alpha', players: [] }]),
    );
    fixture.detectChanges();

    fixture.componentInstance.printTeamList();
    fixture.detectChanges();

    // beforeprint never fires (print engine never engaged) — advance past the detection timeout.
    vi.advanceTimersByTime(1000);

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({ typeIcon: 'warning', type: 'Impression' }),
    );

    vi.useRealTimers();
  });

  it('does not emit a notification when beforeprint fires before the detection timeout, however long the dialog stays open', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'print').mockImplementation(() => {});
    const fixture = TestBed.createComponent(TournamentTeamConfigurationCard);
    const emitSpy = vi.fn();
    fixture.componentInstance.notification.subscribe(emitSpy);
    fixture.componentRef.setInput(
      'tournament',
      buildTournament([{ id: 'team-1', code: '1234', name: 'Alpha', players: [] }]),
    );
    fixture.detectChanges();

    fixture.componentInstance.printTeamList();
    fixture.detectChanges();

    // The print engine engages immediately...
    window.dispatchEvent(new Event('beforeprint'));
    vi.advanceTimersByTime(1000);
    // ...but the admin takes a long time interacting with the actual dialog before afterprint fires.
    vi.advanceTimersByTime(60000);

    expect(emitSpy).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('afterprint'));
    expect(fixture.componentInstance.isPrinting()).toBe(false);

    vi.useRealTimers();
  });

  it('disables the print action when the tournament has no teams', () => {
    const fixture = TestBed.createComponent(TournamentTeamConfigurationCard);
    fixture.componentRef.setInput('tournament', buildTournament([]));
    fixture.detectChanges();

    expect(fixture.componentInstance.hasTeams()).toBe(false);
  });
});
