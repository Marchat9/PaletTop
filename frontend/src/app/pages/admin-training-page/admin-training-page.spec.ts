import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { connectTrainingAdministrator } from 'src/app/store/training/training.admin.actions';
import {
  selectAddTrainingMemberLoading,
  selectCheckinTrainingParticipantLoading,
  selectCloseTrainingSessionLoading,
  selectCreateTrainingSessionLoading,
  selectCreateTrainingTeamLoading,
  selectCurrentTrainingAdminInformations,
  selectCurrentTrainingData,
  selectCurrentTrainingIsLoading,
  selectCurrentTrainingRound,
  selectCurrentTrainingSessionData,
  selectCurrentTrainingSessionIsLoading,
  selectDissolveTrainingTeamLoading,
  selectGenerateTrainingRoundLoading,
  selectRemoveTrainingMemberLoading,
  selectRemoveTrainingParticipantLoading,
  selectTrainingLeaderboard,
  selectTrainingRounds,
  selectTrainingSessions,
  selectTrainingSessionsIsLoading,
  selectUpdateTrainingLoading,
} from 'src/app/store/training/training.selectors';
import { AdminTrainingPage } from './admin-training-page';

function setup() {
  const activatedRoute = {
    paramMap: of(convertToParamMap({ trainingCode: 'ABCD' })),
  } as unknown as ActivatedRoute;
  const routerMock = { navigate: vi.fn() };

  TestBed.configureTestingModule({
    imports: [AdminTrainingPage],
    providers: [
      { provide: ActivatedRoute, useValue: activatedRoute },
      { provide: Router, useValue: routerMock },
      provideMockStore({
        selectors: [
          { selector: selectCurrentTrainingData, value: null },
          {
            selector: selectCurrentTrainingAdminInformations,
            value: { code: 'ABCD', password: 'secret' },
          },
          { selector: selectCurrentTrainingIsLoading, value: true },
          { selector: selectTrainingSessions, value: [] },
          { selector: selectTrainingSessionsIsLoading, value: false },
          { selector: selectCurrentTrainingSessionData, value: null },
          { selector: selectCurrentTrainingSessionIsLoading, value: false },
          { selector: selectTrainingRounds, value: [] },
          { selector: selectCurrentTrainingRound, value: null },
          { selector: selectTrainingLeaderboard, value: [] },
          { selector: selectUpdateTrainingLoading, value: false },
          { selector: selectAddTrainingMemberLoading, value: false },
          { selector: selectRemoveTrainingMemberLoading, value: false },
          { selector: selectCreateTrainingSessionLoading, value: false },
          { selector: selectCloseTrainingSessionLoading, value: false },
          { selector: selectCheckinTrainingParticipantLoading, value: false },
          { selector: selectRemoveTrainingParticipantLoading, value: false },
          { selector: selectCreateTrainingTeamLoading, value: false },
          { selector: selectDissolveTrainingTeamLoading, value: false },
          { selector: selectGenerateTrainingRoundLoading, value: false },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(AdminTrainingPage);
  const store = TestBed.inject(MockStore);
  return { fixture, store, routerMock };
}

describe('AdminTrainingPage', () => {
  it('connects as training administrator using the route code and stored password', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(
      connectTrainingAdministrator({ code: 'ABCD', password: 'secret' }),
    );
  });
});
