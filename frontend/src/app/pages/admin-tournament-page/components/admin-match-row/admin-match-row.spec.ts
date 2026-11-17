import { Dialog } from '@angular/cdk/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { SessionMatchDto } from 'src/app/models/matches-session.model';
import { ScoreUpdate } from 'src/app/models/score-update.model';
import { AdminMatchRow } from './admin-match-row';
import { MatchScoreSheet } from './match-score-sheet/match-score-sheet';

const MATCH: SessionMatchDto = {
  id: 'm6',
  status: 'VALIDATED',
  isBye: false,
  scoreA: 6,
  scoreB: 13,
  plateNumber: 6,
  teamA: { id: 'a', name: 'Les Vendéens' },
  teamB: { id: 'b', name: 'US Saint-Malo' },
  poolNumber: 2,
  group: null,
  startedAt: null,
  finishedAt: null,
  duration: null,
};

interface RenderOptions {
  editing?: boolean;
  editable?: boolean;
  match?: SessionMatchDto;
  mobile?: boolean;
}

function render({
  editing = false,
  editable = true,
  match = MATCH,
  mobile = false,
}: RenderOptions = {}) {
  const sheetClosed = new Subject<ScoreUpdate | undefined>();
  const dialog = { open: vi.fn(() => ({ closed: sheetClosed })) };
  TestBed.configureTestingModule({
    providers: [
      { provide: Dialog, useValue: dialog },
      { provide: BreakpointObserver, useValue: { isMatched: () => mobile } },
    ],
  });
  const fixture = TestBed.createComponent(AdminMatchRow);
  fixture.componentRef.setInput('match', match);
  fixture.componentRef.setInput('pointsPerGame', 13);
  fixture.componentRef.setInput('editable', editable);
  fixture.componentRef.setInput('editing', editing);
  fixture.componentRef.setInput('showLiveStatus', false);
  fixture.detectChanges();
  const submitted: ScoreUpdate[] = [];
  let editRequests = 0;
  let cancels = 0;
  fixture.componentInstance.scoreSubmitted.subscribe((update) => submitted.push(update));
  fixture.componentInstance.editRequested.subscribe(() => editRequests++);
  fixture.componentInstance.editCancelled.subscribe(() => cancels++);
  return {
    fixture,
    row: fixture.componentInstance,
    root: fixture.nativeElement as HTMLElement,
    dialog,
    sheetClosed,
    submitted,
    editRequests: () => editRequests,
    cancels: () => cancels,
  };
}

describe('AdminMatchRow', () => {
  it('shows the plate, each team with its score, and highlights the winner', () => {
    const { root } = render();

    expect(root.querySelector('.plate .plate-label')?.textContent?.trim()).toBe('Plaque');
    expect(root.querySelector('.plate .plate-number')?.textContent?.trim()).toBe('6');
    expect(root.querySelector('.score-a')?.textContent?.trim()).toBe('6');
    expect(root.querySelector('.score-b')?.textContent?.trim()).toBe('13');
    expect(root.querySelector('.team-b')?.classList).toContain('winner');
    expect(root.querySelector('.team-a')?.classList).not.toContain('winner');
  });

  it('is a button only when the match can be corrected', () => {
    expect(render({ editable: true }).root.querySelector('button.match-row')).not.toBeNull();
    TestBed.resetTestingModule();
    const locked = render({ editable: false }).root;
    expect(locked.querySelector('button.match-row')).toBeNull();
    expect(locked.querySelector('div.match-row')).not.toBeNull();
  });

  it('asks the parent to correct in the line on desktop', () => {
    const { root, dialog, editRequests } = render({ mobile: false });

    (root.querySelector('button.match-row') as HTMLElement).click();

    expect(editRequests()).toBe(1);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('opens the bottom sheet on mobile and submits the score it returns', () => {
    const { root, dialog, sheetClosed, submitted, editRequests } = render({ mobile: true });

    (root.querySelector('button.match-row') as HTMLElement).click();
    expect(dialog.open).toHaveBeenCalledWith(
      MatchScoreSheet,
      expect.objectContaining({
        data: { match: MATCH, pointsPerGame: 13 },
        panelClass: 'match-score-sheet-panel',
      }),
    );
    expect(editRequests()).toBe(0);

    sheetClosed.next({ matchId: 'm6', scoreA: 13, scoreB: 9 });
    expect(submitted).toEqual([{ matchId: 'm6', scoreA: 13, scoreB: 9 }]);
  });

  it('submits nothing when the sheet is cancelled', () => {
    const { root, sheetClosed, submitted } = render({ mobile: true });

    (root.querySelector('button.match-row') as HTMLElement).click();
    sheetClosed.next(undefined);

    expect(submitted).toEqual([]);
  });

  it('turns the line into the correction and shows the previous score', () => {
    const { root, row } = render({ editing: true });

    expect(root.querySelectorAll('app-score-stepper')).toHaveLength(2);
    expect(row.draftScoreA()).toBe(6);
  });

  it('saves only a changed score, with Enter from a score field', () => {
    const { root, row, submitted } = render({ editing: true });
    const field = root.querySelector('app-score-stepper input') as HTMLInputElement;

    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(submitted).toEqual([]);

    row.draftScoreA.set(13);
    row.draftScoreB.set(9);
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(submitted).toEqual([{ matchId: 'm6', scoreA: 13, scoreB: 9 }]);
  });

  it('cancels the correction with Escape and drops the draft when reopened', () => {
    const { fixture, root, row, cancels } = render({ editing: true });
    row.draftScoreA.set(11);

    root
      .querySelector('.is-editing')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cancels()).toBe(1);

    fixture.componentRef.setInput('editing', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('editing', true);
    fixture.detectChanges();
    expect(row.draftScoreA()).toBe(6);
  });

  it('shows a bye without score nor correction', () => {
    const { root } = render({ match: { ...MATCH, isBye: true, teamB: null } });

    expect(root.querySelector('.bye-badge')?.textContent).toContain('Exempté');
    expect(root.querySelector('button')).toBeNull();
  });
});
