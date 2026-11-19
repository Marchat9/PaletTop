import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { AdminMatchView } from 'src/app/models/admin-match.model';
import { MatchScoreSheet } from './match-score-sheet';

const MATCH: AdminMatchView = {
  id: 'm6',
  status: 'VALIDATED',
  isBye: false,
  scoreA: 6,
  scoreB: 13,
  plateNumber: 6,
  teamA: 'Les Vendéens',
  teamB: 'US Saint-Malo',
  startedAt: null,
  finishedAt: null,
};

function render(match: AdminMatchView = MATCH) {
  const dialogRef = { close: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      { provide: DialogRef, useValue: dialogRef },
      { provide: DIALOG_DATA, useValue: { match, pointsPerGame: 13 } },
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
    expect(sheet.canSave()).toBe(false);
    sheet.draftScoreA.set(7);
    expect(sheet.hasChanges()).toBe(true);
    expect(sheet.canSave()).toBe(true);
  });

  it('allows validating an ended match as it is', () => {
    const { sheet } = render({ ...MATCH, status: 'ENDED' });

    expect(sheet.hasChanges()).toBe(false);
    expect(sheet.canSave()).toBe(true);
  });
});
