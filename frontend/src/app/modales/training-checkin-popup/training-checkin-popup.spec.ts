import { DialogModule, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  checkinTrainingParticipant,
  removeTrainingParticipant,
} from 'src/app/store/training/training.session.actions';
import {
  AdminTrainingDto,
  TrainingParticipantAdminDto,
  TrainingSessionAdminDto,
} from 'src/app/store/training/training.models';
import {
  selectCheckinTrainingParticipantLoading,
  selectCurrentTrainingData,
  selectCurrentTrainingSessionData,
  selectLastCheckedInTrainingParticipant,
  selectRemoveTrainingParticipantLoading,
} from 'src/app/store/training/training.selectors';
import { TrainingCheckinPopup } from './training-checkin-popup';

function buildTraining(): AdminTrainingDto {
  return {
    id: 't1',
    code: 'LAITON-2026',
    name: 'Entraînement du jeudi',
    createdAt: new Date().toISOString(),
    members: [
      { id: 'm1', name: 'Jean Dubois' },
      { id: 'm2', name: 'Marie Lefèvre' },
      { id: 'm3', name: 'Paul Renaud' },
    ],
  };
}

function buildSession(participants: TrainingParticipantAdminDto[]): TrainingSessionAdminDto {
  return {
    id: 's1',
    code: '1234',
    trainingCode: 'CLUB-1',
    date: new Date().toISOString(),
    status: 'OPEN',
    playersPerTeam: 2,
    allowedTeamSizes: [1, 2],
    preferTargetTeamSize: true,
    plateCount: 4,
    teamComposition: 'RANDOM',
    avoidSamePartnerConsecutive: true,
    avoidSameOpponentConsecutive: true,
    pointsPerGame: 13,
    createdAt: new Date().toISOString(),
    participants,
    teams: [],
  };
}

function setup(participants: TrainingParticipantAdminDto[]) {
  TestBed.configureTestingModule({
    imports: [DialogModule, TrainingCheckinPopup],
    providers: [
      { provide: DialogRef, useValue: { close: vi.fn() } as unknown as DialogRef },
      { provide: DIALOG_DATA, useValue: { sessionCode: '1234' } },
      provideMockStore({
        selectors: [
          { selector: selectCurrentTrainingData, value: buildTraining() },
          { selector: selectCurrentTrainingSessionData, value: buildSession(participants) },
          { selector: selectCheckinTrainingParticipantLoading, value: false },
          { selector: selectRemoveTrainingParticipantLoading, value: false },
          { selector: selectLastCheckedInTrainingParticipant, value: null },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(TrainingCheckinPopup);
  const store = TestBed.inject(MockStore);
  fixture.detectChanges();

  return { fixture, store };
}

describe('TrainingCheckinPopup', () => {
  it('garde tout le roster affiché et marque chaque membre selon son état', () => {
    const { fixture } = setup([
      { id: 'p1', name: 'Jean Dubois', status: 'PRESENT', code: '4821', memberId: 'm1' },
      { id: 'p2', name: 'Marie Lefèvre', status: 'LEFT', code: '9037', memberId: 'm2' },
    ]);

    const entries = fixture.componentInstance.memberEntries();

    expect(entries.map((entry) => [entry.name, entry.state])).toEqual([
      ['Jean Dubois', 'present'],
      ['Marie Lefèvre', 'left'],
      ['Paul Renaud', 'absent'],
    ]);
  });

  it("regroupe les allers-retours d'un joueur de passage en une seule pastille", () => {
    const { fixture } = setup([
      { id: 'p1', name: 'Hugo Vasseur', status: 'LEFT', code: '2260' },
      { id: 'p2', name: 'Hugo Vasseur', status: 'LEFT', code: '3371' },
    ]);

    const guests = fixture.componentInstance.guestEntries();

    expect(guests.length).toBe(1);
    expect(guests[0]).toMatchObject({ name: 'Hugo Vasseur', state: 'left' });
  });

  it('fait revenir un membre reparti sans retaper son nom', () => {
    const { fixture, store } = setup([
      { id: 'p2', name: 'Marie Lefèvre', status: 'LEFT', code: '9037', memberId: 'm2' },
    ]);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const entry = fixture.componentInstance.memberEntries()[1];

    fixture.componentInstance.onMemberClick(entry);

    expect(dispatchSpy).toHaveBeenCalledWith(
      checkinTrainingParticipant({ sessionCode: '1234', memberId: 'm2' }),
    );
  });

  // Re-clicking a present member undoes the check-in instead of doing nothing.
  it('retire un membre présent au re-clic', () => {
    const { fixture, store } = setup([
      { id: 'p1', name: 'Jean Dubois', status: 'PRESENT', code: '4821', memberId: 'm1' },
    ]);
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.onMemberClick(fixture.componentInstance.memberEntries()[0]);

    expect(dispatchSpy).toHaveBeenCalledWith(
      removeTrainingParticipant({ sessionCode: '1234', participantId: 'p1' }),
    );
  });

  it('retire un joueur de passage présent au re-clic', () => {
    const { fixture, store } = setup([
      { id: 'g1', name: 'Hugo Vasseur', status: 'PRESENT', code: '2260' },
    ]);
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.onGuestClick(fixture.componentInstance.guestEntries()[0]);

    expect(dispatchSpy).toHaveBeenCalledWith(
      removeTrainingParticipant({ sessionCode: '1234', participantId: 'g1' }),
    );
  });
});
