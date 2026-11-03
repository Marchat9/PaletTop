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
    expect(host.textContent).toContain('1 / 16 équipes inscrites');
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
    expect(host.querySelector('.step-detail.is-blocked')?.textContent).toContain(
      '4 équipes contre 4',
    );
  });

  it('is not shown once the tournament has started', () => {
    const host = render(tournament(4, { status: TournamentStatus.ACTIVE }));
    expect(host.querySelector('.next-step')).toBeNull();
  });
});
