import { TestBed } from '@angular/core/testing';
import { PlayerMatchResult } from 'src/app/models/player-match-view.model';
import { PlayerMatchHistory } from './player-match-history';

function result(id: string, status: string): PlayerMatchResult {
  return {
    id,
    label: `Match ${id}`,
    status,
    myScore: 11,
    opponentScore: 4,
    opponentLabel: 'Adversaire',
    isBye: false,
  };
}

function badges(results: PlayerMatchResult[]): string[] {
  TestBed.configureTestingModule({ imports: [PlayerMatchHistory] });
  const fixture = TestBed.createComponent(PlayerMatchHistory);
  fixture.componentRef.setInput('results', results);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return Array.from(element.querySelectorAll('.status-badge')).map((b) => b.textContent!.trim());
}

describe('PlayerMatchHistory', () => {
  it('labels a validated match "Validé" and an ended one "En validation"', () => {
    expect(badges([result('1', 'VALIDATED'), result('2', 'ENDED')])).toEqual([
      'Validé',
      'En validation',
    ]);
  });

  it("shows the row's own team label rather than the page-wide one", () => {
    TestBed.configureTestingModule({ imports: [PlayerMatchHistory] });
    const fixture = TestBed.createComponent(PlayerMatchHistory);
    fixture.componentRef.setInput('myLabel', 'Team name');
    fixture.componentRef.setInput('results', [
      { ...result('1', 'VALIDATED'), myLabel: 'Alice · Bob · Chloé' },
      result('2', 'VALIDATED'),
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const labels = Array.from(element.querySelectorAll('.team.current')).map((team) =>
      team.textContent!.trim(),
    );
    expect(labels).toEqual(['Alice · Bob · Chloé (vous)', 'Team name (vous)']);
  });
});
