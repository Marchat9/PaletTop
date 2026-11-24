import { TestBed } from '@angular/core/testing';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { TournamentNextStep } from './tournament-next-step';

function tournament(teamCount: number, overrides: Partial<TournamentDto> = {}): TournamentDto {
  return {
    status: TournamentStatus.DRAFT,
    configuration: { maxTeamCapacity: 16, competitionMode: 'standard' },
    teams: Array.from({ length: teamCount }, (_, i) => ({
      id: `t${i}`,
      name: `T${i}`,
      players: [],
    })),
    ...overrides,
  } as unknown as TournamentDto;
}

function render(value: TournamentDto) {
  const fixture = TestBed.createComponent(TournamentNextStep);
  fixture.componentRef.setInput('tournament', value);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const currentTitle = (host: HTMLElement) =>
  host.querySelector('.step.is-current .step-title')?.textContent?.trim();

describe('TournamentNextStep', () => {
  it('asks for teams first', () => {
    const host = render(tournament(1));
    expect(currentTitle(host)).toBe('Ajouter des équipes');
    expect(host.textContent).toContain('1 équipe (cible 16) inscrites');
  });

  it('shows the limit of a mode whose capacity is not only a target', () => {
    const host = render(
      tournament(1, {
        configuration: { maxTeamCapacity: 16, competitionMode: 'up_down' },
      } as unknown as Partial<TournamentDto>),
    );
    expect(host.textContent).toContain('1 / 16 équipes inscrites');
  });

  // The target of a structured tournament is not a limit: teams can still be added above it.
  it('keeps offering to add teams above the target of a structured tournament', () => {
    const host = render(tournament(20));
    expect(host.querySelector('.step.is-done')?.textContent).toContain('20 équipes (cible 16)');
    expect(host.querySelector('.step.is-done')?.textContent).toContain('ajouter une équipe');
  });

  it('moves on to the start once two teams are registered', () => {
    const host = render(tournament(3));
    expect(currentTitle(host)).toBe('Démarrer le tournoi');
    expect(host.querySelector('.step.is-done')?.textContent).toContain('ajouter une équipe');
  });

  it('explains a championship that cannot start yet', () => {
    const host = render(
      tournament(3, {
        configuration: {
          maxTeamCapacity: 8,
          competitionMode: 'championship',
          competitionConfiguration: { homeClub: 'Home', awayClub: 'Away' },
        },
      } as unknown as Partial<TournamentDto>),
    );
    expect(host.querySelector('app-inline-notice.step-detail')?.textContent).toContain(
      '4 équipes contre 4',
    );
  });

  it('is not shown once the tournament has started', () => {
    const host = render(tournament(4, { status: TournamentStatus.ACTIVE }));
    expect(host.querySelector('.next-step')).toBeNull();
  });

  describe('import entry point', () => {
    const importButton = (host: HTMLElement) =>
      Array.from(host.querySelectorAll('app-button')).find((b) =>
        b.textContent?.includes('Importer depuis Excel'),
      );
    const importLink = (host: HTMLElement) =>
      Array.from(host.querySelectorAll('button.link')).find((b) =>
        b.textContent?.includes('importer depuis Excel'),
      );

    it('shows the import button in draft when not full', () => {
      expect(importButton(render(tournament(0)))).toBeTruthy();
      expect(importLink(render(tournament(3)))).toBeTruthy();
    });

    it('hides it in championship and when full', () => {
      const championship = {
        configuration: {
          maxTeamCapacity: 16,
          competitionMode: 'championship',
          competitionConfiguration: { homeClub: 'Home', awayClub: 'Away' },
        },
      } as unknown as Partial<TournamentDto>;
      expect(importButton(render(tournament(0, championship)))).toBeUndefined();
      expect(importLink(render(tournament(3, championship)))).toBeUndefined();
      const upDown = {
        configuration: { maxTeamCapacity: 16, competitionMode: 'up_down' },
      } as unknown as Partial<TournamentDto>;
      expect(importLink(render(tournament(16, upDown)))).toBeUndefined();
    });

    it('emits importTeams', () => {
      const fixture = TestBed.createComponent(TournamentNextStep);
      fixture.componentRef.setInput('tournament', tournament(0));
      const spy = vi.fn();
      fixture.componentInstance.importTeams.subscribe(spy);
      fixture.detectChanges();
      importButton(fixture.nativeElement)?.querySelector<HTMLElement>('.button')?.click();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
