import { DialogConfig } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { environment } from 'src/environments/environment';

/** Same limit as the rest of the application: below it, the leaderboard opens from the bottom. */
export const LEADERBOARD_MOBILE_QUERY = `(max-width: ${environment.limitMobileSizePx}px)`;

/** Where a leaderboard popup opens: centred on desktop, as a bottom sheet on mobile. */
export type LeaderboardDialogPlacement = Pick<
  DialogConfig,
  'positionStrategy' | 'panelClass' | 'backdropClass'
>;

export function leaderboardDialogPlacement(
  overlay: Overlay,
  isMobile: boolean,
  desktopPanelClass: string,
): LeaderboardDialogPlacement {
  if (isMobile) {
    return {
      positionStrategy: overlay.position().global().bottom('0').width('100%'),
      panelClass: 'leaderboard-sheet-panel',
      backdropClass: 'dialog-backdrop-light',
    };
  }
  return { panelClass: desktopPanelClass, backdropClass: 'dialog-backdrop-light' };
}
