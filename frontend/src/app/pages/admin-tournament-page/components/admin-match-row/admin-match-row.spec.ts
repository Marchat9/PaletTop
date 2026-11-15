import { TestBed } from '@angular/core/testing';
import { SessionMatchDto } from 'src/app/models/matches-session.model';
import { ScoreUpdate } from 'src/app/models/score-update.model';
import { AdminMatchRow } from './admin-match-row';

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

function render(inputs: { editing?: boolean; editable?: boolean; match?: SessionMatchDto } = {}) {
  const fixture = TestBed.createComponent(AdminMatchRow);
  fixture.componentRef.setInput('match', inputs.match ?? MATCH);
  fixture.componentRef.setInput('pointsPerGame', 13);
  fixture.componentRef.setInput('editable', inputs.editable ?? true);
  fixture.componentRef.setInput('editing', inputs.editing ?? false);
  fixture.componentRef.setInput('showLiveStatus', false);
  fixture.detectChanges();
  const submitted: ScoreUpdate[] = [];
  fixture.componentInstance.scoreSubmitted.subscribe((update) => submitted.push(update));
  return {
    fixture,
    row: fixture.componentInstance,
    root: fixture.nativeElement as HTMLElement,
    submitted,
  };
}

describe('AdminMatchRow', () => {
  it('shows each team with its score and highlights the winner', () => {
    const { root } = render();

    expect(root.querySelector('.team-a')?.textContent).toContain('Les Vendéens');
    expect(root.querySelector('.score-a')?.textContent?.trim()).toBe('6');
    expect(root.querySelector('.score-b')?.textContent?.trim()).toBe('13');
    expect(root.querySelector('.team-b')?.classList).toContain('winner');
    expect(root.querySelector('.team-a')?.classList).not.toContain('winner');
  });

  it('hides the edit button on a round that cannot be corrected', () => {
    expect(render({ editable: true }).root.querySelector('.edit-btn')).not.toBeNull();
    TestBed.resetTestingModule();
    expect(render({ editable: false }).root.querySelector('.edit-btn')).toBeNull();
  });

  it('starts the correction from the saved score and shows it as the previous score', () => {
    const { row, root } = render({ editing: true });

    expect(row.draftScoreA()).toBe(6);
    expect(row.draftScoreB()).toBe(13);
    expect(root.querySelector('.previous-score')?.textContent).toContain(
      'Score précédent : 6 – 13',
    );
  });

  it('steps the scores between 0 and the points per game', () => {
    const { row } = render({ editing: true });

    row.stepScoreA(1);
    row.stepScoreB(1);
    expect(row.draftScoreA()).toBe(7);
    expect(row.draftScoreB()).toBe(13);

    row.setScoreA(-4);
    expect(row.draftScoreA()).toBe(0);
    expect(row.canDecrementA()).toBe(false);
    expect(row.canIncrementB()).toBe(false);
  });

  it('submits the corrected score of the match', () => {
    const { row, submitted } = render({ editing: true });

    row.setScoreA(13);
    row.setScoreB(9);
    row.submit();

    expect(submitted).toEqual([{ matchId: 'm6', scoreA: 13, scoreB: 9 }]);
  });

  it('cannot save before a score changed', () => {
    const { row } = render({ editing: true });

    expect(row.hasChanges()).toBe(false);
    row.stepScoreA(1);
    expect(row.hasChanges()).toBe(true);
  });

  it('drops an unsaved draft when the correction is reopened', () => {
    const { fixture, row } = render({ editing: true });
    row.setScoreA(11);

    fixture.componentRef.setInput('editing', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('editing', true);
    fixture.detectChanges();

    expect(row.draftScoreA()).toBe(6);
  });

  it('shows a bye without score nor edit button', () => {
    const { root } = render({ match: { ...MATCH, isBye: true, teamB: null } });

    expect(root.querySelector('.bye-badge')?.textContent).toContain('Exempté');
    expect(root.querySelector('.edit-btn')).toBeNull();
  });
});
