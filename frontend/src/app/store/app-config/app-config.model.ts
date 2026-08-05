import { ThemeMode } from 'src/app/models/theme-mode.model';

export interface Notification {
  id: string;
  message: string;
  typeIcon: 'success' | 'error' | 'warning' | 'info';
  type: string;
  createdAt: number;
}

export interface AppConfigState {
  theme: ThemeMode;
  notifications: Notification[];
  localStorageData: Record<string, unknown>;
}
