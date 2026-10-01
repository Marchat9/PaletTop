import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { updateTrainingScore } from 'src/app/store/training/training.match.actions';
import {
  TrainingCurrentMatchDto,
  TrainingSessionPublicDto,
} from 'src/app/store/training/training.models';
import {
  selectCurrentTrainingSessionData,
  selectStartTrainingMatchError,
  selectStartTrainingMatchLoading,
  selectTrainingLeaderboard,
  selectTrainingParticipantCurrentMatch,
  selectTrainingParticipantCurrentMatchError,
  selectTrainingParticipantCurrentMatchIsLoading,
  selectTrainingParticipantHistory,
  selectUpdateTrainingScoreError,
  selectValidateTrainingMatchError,
  selectValidateTrainingMatchLoading,
} from 'src/app/store/training/training.selectors';
import { PlayerTrainingSessionPage } from './player-training-session-page';

const ME = { id: 'p1', name: 'Jean Dubois' };

function buildSession(): TrainingSessionPublicDto {
  return {
    id: 's1',
    code: '1234',
    date: new Date().toISOString(),
    status: 'OPEN',
    playersPerTeam: 2,
    allowedTeamSizes: [1, 2],
    preferTargetTeamSize: false,
    plateCount: 4,
    teamComposition: 'RANDOM',
    avoidSamePartnerConsecutive: true,
    avoidSameOpponentConsecutive: true,
    pointsPerGame: 13,
    createdAt: new Date().toISOString(),
    participants: [],
    teams: [],
  };
}

/** The participant is in team B: their score is therefore `scoreB`. */
function buildCurrentMatch(): TrainingCurrentMatchDto {
  return {
    participant: ME,
    roundNumber: 3,
    sitOut: false,
    match: {
      id: 'm1',
      status: 'ONGOING',
      isBye: false,
      scoreA: 4,
      scoreB: 7,
      teamA: {
        id: 'tA',
        kind: 'EPHEMERAL',
        members: [
          { id: 'p3', name: 'Luc Béguin' },
          { id: 'p4', name: 'Claire Ozanne' },
        ],
      },
      teamB: {
        id: 'tB',
        kind: 'EPHEMERAL',
        members: [
          { id: 'p1', name: 'Jean Dubois' },
          { id: 'p2', name: 'Marie Lefèvre' },
        ],
      },
    },
  };
}

function setup(
  currentMatch: TrainingCurrentMatchDto | null = buildCurrentMatch(),
  session: TrainingSessionPublicDto = buildSession(),
) {
  const activatedRoute = {
    paramMap: of(convertToParamMap({ sessionCode: '1234', participantCode: '4821' })),
  } as unknown as ActivatedRoute;
  const routerMock = { navigate: vi.fn() };
  const actions$ = new Subject<Action>();

  TestBed.configureTestingModule({
    imports: [PlayerTrainingSessionPage],
    providers: [
      { provide: ActivatedRoute, useValue: activatedRoute },
      { provide: Router, useValue: routerMock },
      { provide: Actions, useValue: actions$ },
      provideMockStore({
        selectors: [
          { selector: selectTrainingParticipantCurrentMatch, value: currentMatch },
          { selector: selectCurrentTrainingSessionData, value: session },
          { selector: selectTrainingParticipantHistory, value: [] },
          {
            selector: selectTrainingLeaderboard,
            value: [
              { participantId: 'p2', name: 'Marie Lefèvre', wins: 3, points: 34 },
              { participantId: 'p1', name: 'Jean Dubois', wins: 2, points: 27 },
            ],
          },
          { selector: selectTrainingParticipantCurrentMatchIsLoading, value: false },
          { selector: selectTrainingParticipantCurrentMatchError, value: null },
          { selector: selectStartTrainingMatchLoading, value: false },
          { selector: selectStartTrainingMatchError, value: null },
          { selector: selectUpdateTrainingScoreError, value: null },
          { selector: selectValidateTrainingMatchLoading, value: false },
          { selector: selectValidateTrainingMatchError, value: null },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(PlayerTrainingSessionPage);
  const store = TestBed.inject(MockStore);
  fixture.detectChanges();

  return { fixture, store, routerMock };
}

describe('PlayerTrainingSessionPage', () => {
  it("identifie le camp du joueur par son appartenance à l'équipe", () => {
    const { fixture } = setup();

    const view = fixture.componentInstance.matchView();

    expect(view?.iAmTeamA).toBe(false);
    expect(view?.myScore).toBe(7);
    expect(view?.opponentScore).toBe(4);
    expect(view?.myLabel).toBe('Jean Dubois · Marie Lefèvre');
    expect(view?.opponentLabel).toBe('Luc Béguin · Claire Ozanne');
    expect(view?.subtitle).toBe('Round 3');
  });

  it('liste les coéquipiers du round sans le joueur lui-même', () => {
    const { fixture } = setup();

    expect(fixture.componentInstance.partners().map((p) => p.name)).toEqual(['Marie Lefèvre']);
  });

  it('situe le joueur dans le classement de la séance', () => {
    const { fixture } = setup();

    const tiles = fixture.componentInstance.statTiles();

    expect(tiles.find((t) => t.key === 'wins')?.value).toBe('2');
    expect(tiles.find((t) => t.key === 'points')?.value).toBe('27');
    expect(tiles.find((t) => t.key === 'rank')?.value).toBe('2/2');
  });

  it('remet les scores dans le sens du match quand le joueur est en équipe B', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.updateScore({ myScore: 11, opponentScore: 6 });

    expect(dispatchSpy).toHaveBeenCalledWith(
      updateTrainingScore({
        sessionCode: '1234',
        matchId: 'm1',
        participantCode: '4821',
        scoreA: 6,
        scoreB: 11,
      }),
    );
  });

  // The leaderboard only lists those who played: relying on it would suggest a much smaller session
  // than it really is.
  it('se compare aux présents, pas seulement à ceux qui ont déjà joué', () => {
    const session = buildSession();
    const { fixture } = setup(buildCurrentMatch(), {
      ...session,
      participants: [
        { id: 'p1', name: 'Jean Dubois', status: 'PRESENT' },
        { id: 'p2', name: 'Marie Lefèvre', status: 'PRESENT' },
        { id: 'p3', name: 'Luc Béguin', status: 'PRESENT' },
        { id: 'p4', name: 'Claire Ozanne', status: 'PRESENT' },
        { id: 'p5', name: 'Hugo Vasseur', status: 'PRESENT' },
        { id: 'p6', name: 'Anne Morel', status: 'LEFT' },
      ],
    });

    // 5 present + 0 gone with a ranking: the test leaderboard only holds p1 and p2, both present.
    expect(fixture.componentInstance.statTiles().find((t) => t.key === 'rank')?.value).toBe('2/5');
  });

  it('annonce le repos dans le titre plutôt que « match en cours »', () => {
    const { fixture } = setup({ participant: ME, roundNumber: 3, sitOut: true, match: null });

    expect(fixture.componentInstance.matchTitle()).toBe('Au repos ce round');
  });

  // A match still to validate stays on screen after closing, titled as the last match.
  it('parle du dernier match à valider une fois la séance close', () => {
    const ended = buildCurrentMatch();
    ended.match!.status = 'ENDED';
    const { fixture } = setup(ended, { ...buildSession(), status: 'CLOSED' });

    expect(fixture.componentInstance.matchTitle()).toBe('Dernier match');
  });

  // A match in progress (or already validated) has nothing left to do once the session is closed:
  // the closing message replaces the match screen.
  it('masque le match en cours et affiche le message de clôture', () => {
    const { fixture } = setup(buildCurrentMatch(), { ...buildSession(), status: 'CLOSED' });

    expect(fixture.componentInstance.cardMatch()).toBeNull();
    expect(fixture.componentInstance.matchTitle()).toBeNull();
    expect(fixture.nativeElement.querySelector('.match-card-empty')?.textContent).toContain(
      'terminée',
    );
  });

  // Marked as gone by the admin: the player must not be left on a stale "at rest" message.
  it('informe le joueur marqué comme parti', () => {
    const gone = { participant: ME, roundNumber: 3, sitOut: true, match: null };
    const { fixture } = setup(gone, {
      ...buildSession(),
      participants: [{ id: 'p1', name: 'Jean Dubois', status: 'LEFT' }],
    });

    expect(fixture.componentInstance.hasLeft()).toBe(true);
    expect(fixture.componentInstance.cardMatch()).toBeNull();
    expect(fixture.componentInstance.matchTitle()).toBeNull();
    expect(fixture.nativeElement.querySelector('.match-card-empty')?.textContent).toContain(
      'parti',
    );
  });

  it('informe le joueur de la clôture et fige la saisie', () => {
    const pending = buildCurrentMatch();
    pending.match!.status = 'PENDING';
    const { fixture } = setup(pending, { ...buildSession(), status: 'CLOSED' });

    const element: HTMLElement = fixture.nativeElement;

    expect(fixture.componentInstance.isSessionClosed()).toBe(true);
    expect(element.querySelector('.session-closed')?.textContent).toContain('terminée');
    // Starting the match is no longer accepted by the server: the button disappears.
    expect(element.querySelector('.match-card__action')).toBeNull();
  });

  it('laisse valider un score déjà saisi après la clôture', () => {
    const ended = buildCurrentMatch();
    ended.match!.status = 'ENDED';
    const { fixture } = setup(ended, { ...buildSession(), status: 'CLOSED' });

    expect(fixture.componentInstance.canStillValidate()).toBe(true);
    expect(fixture.nativeElement.querySelector('.match-card__validate')).not.toBeNull();
  });

  it("n'affiche aucun match quand le joueur est au repos", () => {
    const { fixture } = setup({
      participant: ME,
      roundNumber: 3,
      sitOut: true,
      match: null,
    });

    expect(fixture.componentInstance.matchView()).toBeNull();
    expect(fixture.componentInstance.isSittingOut()).toBe(true);
  });
});
