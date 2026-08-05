import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonIcon } from 'src/app/shared/button-icon/button-icon';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import {
  clearNotifications,
  removeNotification,
} from 'src/app/store/app-config/app-config.actions';
import { Notification } from 'src/app/store/app-config/app-config.model';
import { selectNotifications } from 'src/app/store/app-config/app-config.selectors';
import { AppState } from 'src/app/store/app-store';

@Component({
  selector: 'app-notification-popup',
  imports: [Button, ButtonIcon, Icon],
  templateUrl: './notification-popup.html',
  styleUrl: './notification-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationPopupComponent {
  private readonly store = inject(Store<AppState>);
  private readonly dialogRef = inject(DialogRef<void, NotificationPopupComponent>);

  readonly notifications = this.store.selectSignal(selectNotifications);

  public readonly notificationWithDetails = computed(() =>
    this.notifications().map((notification) => ({
      ...notification,
      icon: this.notificationIcon(notification.typeIcon),
      relativeTime: this.relativeTime(notification.createdAt),
    })),
  );

  private notificationIcon(typeIcon: Notification['typeIcon']): string {
    switch (typeIcon) {
      case 'success':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'notifications';
    }
  }

  private relativeTime(createdAt: number): string {
    const diffMs = Date.now() - createdAt;
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < minute) {
      return "À l'instant";
    }

    if (diffMs < hour) {
      const minutes = Math.floor(diffMs / minute);
      return `Il y a ${minutes} min`;
    }

    if (diffMs < day) {
      const hours = Math.floor(diffMs / hour);
      return `Il y a ${hours} h`;
    }

    const days = Math.floor(diffMs / day);
    return `Il y a ${days} j`;
  }

  public close(): void {
    this.dialogRef.close();
  }

  public markAsRead(id: string): void {
    this.store.dispatch(removeNotification({ id }));
  }

  public markAllAsRead(): void {
    this.store.dispatch(clearNotifications());
  }
}
