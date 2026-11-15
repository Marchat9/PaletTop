import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { SessionMatchDto } from 'src/app/models/matches-session.model';
import { MatchScoreSheet } from './match-score-sheet';

const MATCH = {
  id: 'm6',
  status: 'VALIDATED',
  isBye: false,
  scoreA: 6,
  scoreB: 13,
  plateNumber: 6,
  teamA: { id: 'a', name: 'Les Vendéens' },
  teamB: { id: 'b', name: 'US Saint-Malo' },
} as SessionMatchDto;

function render() {
  const dialogRef = { close: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      { provide: DialogRef, useValue: dialogRef },
      { provide: DIALOG_DATA, useValue: { match: MATCH, pointsPerGame: 13 } },
    ],
  });
  const fixture = TestBed.createComponent(MatchScoreSheet);
  fixture.detectChanges();
  return { fixture, sheet: fixture.componentInstance, dialogRef };
}

describe('MatchScoreSheet', () => {
  it('starts from the saved score and shows it as the previous one', () => {
    const { fixture, sheet } = render();

    expect(sheet.draftScoreA()).toBe(6);
    expect(sheet.draftScoreB()).toBe(13);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Avant : 6 – 13');
  });

  it('closes with the corrected score', () => {
    const { sheet, dialogRef } = render();

    sheet.draftScoreA.set(13);
    sheet.draftScoreB.set(9);
    sheet.save();

    expect(dialogRef.close).toHaveBeenCalledWith({ matchId: 'm6', scoreA: 13, scoreB: 9 });
  });

  it('closes with nothing on cancel', () => {
    const { sheet, dialogRef } = render();

    sheet.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('only allows saving once a score changed', () => {
    const { sheet } = render();

    expect(sheet.hasChanges()).toBe(false);
    sheet.draftScoreA.set(7);
    expect(sheet.hasChanges()).toBe(true);
  });
});
