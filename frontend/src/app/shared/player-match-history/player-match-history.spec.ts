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
});
