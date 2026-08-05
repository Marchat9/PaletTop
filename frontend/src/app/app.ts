import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ThemeMode } from 'src/app/models/theme-mode.model';
import { setTheme } from 'src/app/store/app-config/app-config.actions';
import { AppState } from 'src/app/store/app-store';
import { Navigation } from './shared/navigation/navigation';
import { selectTheme } from 'src/app/store/app-config/app-config.selectors';

@Component({
  selector: 'app-root',
  imports: [Navigation],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly store = inject(Store<AppState>);

  // Theme
  public readonly theme = this.store.selectSignal(selectTheme);
  public changeTheme(theme: ThemeMode): void {
    this.store.dispatch(setTheme({ theme }));
  }
}
