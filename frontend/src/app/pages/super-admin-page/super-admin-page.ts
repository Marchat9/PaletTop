import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { clearSuperAdminSession } from 'src/app/store/superadmin/superadmin.actions';
import { selectSuperAdminPassword } from 'src/app/store/superadmin/superadmin.selectors';

@Component({
  selector: 'app-super-admin-page',
  imports: [],
  templateUrl: './super-admin-page.html',
  styleUrl: './super-admin-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminPageComponent implements OnDestroy {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  constructor() {
    if (this.store.selectSignal(selectSuperAdminPassword)() === null) {
      this.router.navigate(['/']);
    }
  }

  ngOnDestroy(): void {
    this.store.dispatch(clearSuperAdminSession());
  }
}
