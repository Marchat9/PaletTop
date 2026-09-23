import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { selectCurrentTrainingAdminInformations } from 'src/app/store/training/training.selectors';
import { TrainingAdminConnectionPage } from './training-admin-connection-page';

function setup(adminInfo: { code: string; password: string } | null) {
  const routerMock = { navigate: vi.fn() };
  const dialogMock = { open: vi.fn().mockReturnValue({ closed: of({ trainingCode: 'NEW1' }) }) };

  TestBed.configureTestingModule({
    imports: [TrainingAdminConnectionPage],
    providers: [
      { provide: Router, useValue: routerMock },
      { provide: Dialog, useValue: dialogMock },
      provideMockStore({
        selectors: [{ selector: selectCurrentTrainingAdminInformations, value: adminInfo }],
      }),
    ],
  });

  const fixture = TestBed.createComponent(TrainingAdminConnectionPage);
  fixture.detectChanges();

  return { fixture, routerMock, dialogMock };
}

describe('TrainingAdminConnectionPage', () => {
  it('navigates directly to the training page when admin informations are already known', () => {
    const { routerMock, dialogMock } = setup({ code: 'ABCD', password: 'secret' });

    expect(dialogMock.open).not.toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/training/ABCD']);
  });

  it('opens the connection popup and navigates using its result when no admin informations are known', () => {
    const { routerMock, dialogMock } = setup(null);

    expect(dialogMock.open).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/training/NEW1']);
  });
});
