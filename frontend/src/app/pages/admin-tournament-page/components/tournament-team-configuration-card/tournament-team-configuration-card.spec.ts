import { TestBed } from '@angular/core/testing';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { By } from '@angular/platform-browser';
import { TeamConfig } from './team-config/team-config';
import { TournamentTeamConfigurationCard } from './tournament-team-configuration-card';
import { TounamentTeamDto, TournamentDto } from 'src/app/store/tournament/tournament.models';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { Notification } from 'src/app/store/app-config/app-config.model';
import { PdfExportService } from 'src/app/services/pdf-export.service';

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

interface PdfExportCall {
  documentDefinitions: TDocumentDefinitions;
  fileName: string;
}

function render(download: () => Promise<void> = () => Promise.resolve()) {
  const calls: PdfExportCall[] = [];
  TestBed.configureTestingModule({
    providers: [
      {
        provide: PdfExportService,
        useValue: {
          download: (documentDefinitions: TDocumentDefinitions, fileName: string) => {
            calls.push({ documentDefinitions, fileName });
            return download();
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(TournamentTeamConfigurationCard);
  fixture.componentRef.setInput(
    'tournament',
    buildTournament([{ id: 'team-1', code: '1234', name: 'Alpha', players: [] }]),
  );
  fixture.detectChanges();
  const notifications: Notification[] = [];
  fixture.componentInstance.notification.subscribe((notification) =>
    notifications.push(notification),
  );
  return { fixture, card: fixture.componentInstance, calls, notifications };
}

describe('TournamentTeamConfigurationCard', () => {
  it('downloads the team list PDF named after the tournament', async () => {
    const { card, calls, notifications } = render();

    await card.downloadTeamList();

    expect(calls).toHaveLength(1);
    expect(calls[0].fileName).toBe('equipes-tournoi-test.pdf');
    expect(calls[0].documentDefinitions.pageSize).toBe('A4');
    expect(notifications).toEqual([]);
  });

  it('shows the export as loading until the file is ready', async () => {
    let finish!: () => void;
    const { card } = render(() => new Promise<void>((resolve) => (finish = resolve)));

    const download = card.downloadTeamList();
    expect(card.isExporting()).toBe(true);

    finish();
    await download;
    expect(card.isExporting()).toBe(false);
  });

  it('ignores a second click while a download is running', async () => {
    let finish!: () => void;
    const { card, calls } = render(() => new Promise<void>((resolve) => (finish = resolve)));

    const first = card.downloadTeamList();
    await card.downloadTeamList();
    finish();
    await first;

    expect(calls).toHaveLength(1);
  });

  it('emits a notification when the PDF cannot be generated', async () => {
    const { card, notifications } = render(() => Promise.reject(new Error('chunk load failed')));

    await card.downloadTeamList();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].message).toBe(
      "La liste des équipes n'a pas pu être générée. Réessayez.",
    );
    expect(card.isExporting()).toBe(false);
  });

  it('disables the download action when the tournament has no teams', () => {
    const { fixture } = render();
    fixture.componentRef.setInput('tournament', buildTournament([]));
    fixture.detectChanges();

    expect(fixture.componentInstance.hasTeams()).toBe(false);
  });

  it('forwards club suggestions and search requests', () => {
    const fixture = TestBed.createComponent(TournamentTeamConfigurationCard);
    fixture.componentRef.setInput('tournament', buildTournament([]));
    fixture.componentRef.setInput('clubSuggestions', ['Palet Club']);
    const searchSpy = vi.fn();
    fixture.componentInstance.clubSearchRequested.subscribe(searchSpy);
    fixture.detectChanges();

    const teamConfig = fixture.debugElement.query(By.directive(TeamConfig))
      .componentInstance as TeamConfig;
    expect(teamConfig.clubSuggestions()).toEqual(['Palet Club']);

    teamConfig.clubSearchRequested.emit('Pal');
    expect(searchSpy).toHaveBeenCalledWith('Pal');
  });

  it('opens the import wizard of the team configuration on startTeamImport()', () => {
    const fixture = TestBed.createComponent(TournamentTeamConfigurationCard);
    fixture.componentRef.setInput('tournament', buildTournament([]));
    fixture.detectChanges();
    const teamConfig = fixture.debugElement.query(By.directive(TeamConfig))
      .componentInstance as TeamConfig;
    const openSpy = vi.spyOn(teamConfig, 'openImportWizard').mockImplementation(() => {});

    fixture.componentInstance.startTeamImport();

    expect(openSpy).toHaveBeenCalledTimes(1);
  });
});
