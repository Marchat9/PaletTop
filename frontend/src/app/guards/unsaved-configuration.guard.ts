import { Dialog } from '@angular/cdk/dialog';
import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmationPopupComponent } from 'src/app/modales/confirmation-popup/confirmation-popup';

/** A page that knows whether leaving it would lose what the admin typed. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Leaving a page with changes that were not saved asks first. Kept apart from the page it guards
 * so that the routes can load that page lazily.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (page) => {
  if (!page.hasUnsavedChanges()) {
    return true;
  }
  const dialog = inject(Dialog);
  return new Promise<boolean>((resolve) => {
    dialog
      .open<boolean>(ConfirmationPopupComponent, {
        data: {
          title: 'Quitter la configuration',
          message: 'Les modifications non enregistrées seront perdues.',
          confirmLabel: 'Quitter',
        },
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
        disableClose: false,
      })
      .closed.subscribe((confirmed) => resolve(!!confirmed));
  });
};
